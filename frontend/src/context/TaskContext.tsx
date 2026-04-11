import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import api from '../utils/api';

export type TaskType = 'cv-parse' | 'batch-match' | 'scrape';
export type TaskStatus = 'running' | 'done' | 'error';

export interface Task {
    id: string;
    backendId?: string;
    type: TaskType;
    label: string;
    model?: string;
    status: TaskStatus;
    progress?: number;       // 0–100
    startedAt: Date;
    detail?: string;
    result?: any;            // partial/full results from backend
}

interface TaskContextValue {
    tasks: Task[];
    // Pure frontend task (no backend tracking)
    startTask: (type: TaskType, label: string) => string;
    completeTask: (id: string, detail?: string) => void;
    failTask: (id: string, error: string) => void;
    dismissTask: (id: string) => void;
    // Cancel a running backend task and remove it from the panel
    cancelTask: (id: string) => Promise<void>;
    // Backend-tracked task: polls /api/tasks/:backendId for progress
    trackBackendTask: (
        localId: string,
        backendId: string,
        onResult?: (result: any) => void,
        onDone?: () => void
    ) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

let counter = 0;
const POLL_INTERVAL_MS = 1500;

export function TaskProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const tasksRef = useRef<Task[]>([]);
    const dismissTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const pollTimers   = useRef<Record<string, ReturnType<typeof setInterval>>>({});

    // Keep ref in sync so callbacks can read current tasks without stale closures
    const setTasksSync = useCallback((updater: (prev: Task[]) => Task[]) => {
        setTasks(prev => {
            const next = updater(prev);
            tasksRef.current = next;
            return next;
        });
    }, []);

    const scheduleAutoDismiss = useCallback((id: string, delay: number) => {
        dismissTimers.current[id] = setTimeout(() => {
            setTasksSync(prev => prev.filter(t => t.id !== id));
            delete dismissTimers.current[id];
        }, delay);
    }, [setTasksSync]);

    const startTask = useCallback((type: TaskType, label: string): string => {
        const id = `task-${++counter}`;
        setTasksSync(prev => [...prev, { id, type, label, status: 'running' as TaskStatus, startedAt: new Date() }]);
        return id;
    }, [setTasksSync]);

    const completeTask = useCallback((id: string, detail?: string) => {
        setTasksSync(prev => prev.map(t => t.id === id ? { ...t, status: 'done', progress: 100, detail } : t));
        scheduleAutoDismiss(id, 5000);
    }, [setTasksSync, scheduleAutoDismiss]);

    const failTask = useCallback((id: string, error: string) => {
        setTasksSync(prev => prev.map(t => t.id === id ? { ...t, status: 'error', detail: error } : t));
        scheduleAutoDismiss(id, 10000);
    }, [setTasksSync, scheduleAutoDismiss]);

    const dismissTask = useCallback((id: string) => {
        // Only hide the notification — do NOT stop polling.
        // The poll keeps running so onResult callbacks still fire and
        // it self-terminates when the backend task reaches done/error.
        clearTimeout(dismissTimers.current[id]);
        delete dismissTimers.current[id];
        setTasksSync(prev => prev.filter(t => t.id !== id));
    }, [setTasksSync]);

    const cancelTask = useCallback(async (id: string) => {
        const task = tasksRef.current.find(t => t.id === id);
        if (task?.backendId) {
            try { await api.post(`/tasks/${task.backendId}/cancel`); } catch { /* best effort */ }
        }
        clearTimeout(dismissTimers.current[id]);
        delete dismissTimers.current[id];
        setTasksSync(prev => prev.filter(t => t.id !== id));
    }, [setTasksSync]);

    const stopPolling = useCallback((id: string) => {
        clearInterval(pollTimers.current[id]);
        delete pollTimers.current[id];
    }, []);

    const trackBackendTask = useCallback((
        localId: string,
        backendId: string,
        onResult?: (result: any) => void,
        onDone?: () => void
    ) => {
        // Attach backendId and fetch initial model from backend
        api.get(`/tasks/${backendId}`).then(res => {
            setTasksSync(prev => prev.map(t =>
                t.id === localId ? { ...t, backendId, model: res.data.model ?? t.model } : t
            ));
        }).catch(() => {
            setTasksSync(prev => prev.map(t => t.id === localId ? { ...t, backendId } : t));
        });

        const poll = setInterval(async () => {
            try {
                const res = await api.get(`/tasks/${backendId}`);
                const remote = res.data;

                setTasksSync(prev => prev.map(t => {
                    if (t.id !== localId) return t;
                    return {
                        ...t,
                        progress: remote.progress ?? t.progress,
                        detail: remote.detail ?? t.detail,
                        result: remote.result ?? t.result,
                    };
                }));

                if (remote.result && onResult) {
                    onResult(remote.result);
                }

                if (remote.status === 'done') {
                    stopPolling(localId);
                    setTasksSync(prev => prev.map(t =>
                        t.id === localId
                            ? { ...t, status: 'done', progress: 100, detail: remote.detail }
                            : t
                    ));
                    if (remote.result && onResult) onResult(remote.result);
                    scheduleAutoDismiss(localId, 5000);
                    onDone?.();
                } else if (remote.status === 'error' || remote.status === 'cancelled') {
                    stopPolling(localId);
                    setTasksSync(prev => prev.filter(t => t.id !== localId));
                    onDone?.();
                }
            } catch (err) {
                console.error(`[TaskContext] Poll failed for ${backendId}`, err);
            }
        }, POLL_INTERVAL_MS);

        pollTimers.current[localId] = poll;
    }, [setTasksSync, scheduleAutoDismiss, stopPolling]);

    // On mount: re-register any tasks the backend still has running
    // (handles page refresh mid-operation)
    useEffect(() => {
        api.get('/tasks').then(res => {
            const running: any[] = res.data.filter((t: any) => t.status === 'running');
            if (running.length === 0) return;

            // Pre-compute stable local IDs before touching state
            const pairs = running.map(t => ({ localId: `task-${++counter}`, remote: t }));

            setTasksSync(prev => {
                const existingBackendIds = new Set(prev.map(t => t.backendId).filter(Boolean));
                const toAdd: Task[] = pairs
                    .filter(({ remote }) => !existingBackendIds.has(remote.id))
                    .map(({ localId, remote }) => ({
                        id: localId,
                        backendId: remote.id,
                        type: remote.type as TaskType,
                        label: remote.label,
                        model: remote.model ?? undefined,
                        status: 'running' as TaskStatus,
                        progress: remote.progress ?? 0,
                        detail: remote.detail ?? undefined,
                        startedAt: new Date(remote.created_at),
                    }));
                return [...prev, ...toAdd];
            });

            // Start polling for each recovered task (no onResult — data will
            // be fetched fresh by the relevant page when it mounts)
            pairs.forEach(({ localId, remote }) => {
                trackBackendTask(localId, remote.id);
            });
        }).catch(() => {/* server may not be ready yet */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <TaskContext.Provider value={{ tasks, startTask, completeTask, failTask, dismissTask, cancelTask, trackBackendTask }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTaskContext(): TaskContextValue {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
    return ctx;
}
