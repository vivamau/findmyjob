import { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, X, AlertTriangle } from 'lucide-react';
import { useTaskContext, type Task } from '../context/TaskContext';

function ProgressBar({ value }: { value: number }) {
    return (
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
            <div
                style={{
                    height: '100%',
                    width: `${value}%`,
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                }}
            />
        </div>
    );
}

function DismissConfirmModal({ task, onHide, onStop, onCancel }: {
    task: Task;
    onHide: () => void;
    onStop: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    width: '300px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle size={18} className="text-accent-secondary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-primary mb-1">What would you like to do?</p>
                        <p className="text-xs text-secondary leading-relaxed">
                            <span className="font-medium text-primary">"{task.label}"</span> is still running.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        className="btn btn-xs btn-secondary w-full text-left px-3 py-2 flex flex-col items-start gap-0.5"
                        onClick={onHide}
                    >
                        <span className="font-medium">Hide notification</span>
                        <span className="text-[10px] text-secondary font-normal">Task keeps running, results will be saved</span>
                    </button>
                    <button
                        className="btn btn-xs w-full text-left px-3 py-2 flex flex-col items-start gap-0.5"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                        onClick={onStop}
                    >
                        <span className="font-medium">Stop task</span>
                        <span className="text-[10px] font-normal" style={{ color: 'rgba(248,113,113,0.7)' }}>Cancels the operation at the next checkpoint</span>
                    </button>
                    <button
                        className="btn btn-xs btn-secondary px-3 w-full"
                        onClick={onCancel}
                    >
                        Keep visible
                    </button>
                </div>
            </div>
        </div>
    );
}

function TaskRow({ task, onDismissRequest }: { task: Task; onDismissRequest: () => void }) {
    const elapsed = Math.round((Date.now() - task.startedAt.getTime()) / 1000);
    const hasProgress = task.progress !== undefined && task.progress > 0;

    const icon =
        task.status === 'running' ? (
            <Loader2 size={14} className="animate-spin text-accent-secondary shrink-0" />
        ) : task.status === 'done' ? (
            <CheckCircle2 size={14} className="text-success shrink-0" />
        ) : (
            <XCircle size={14} className="text-error shrink-0" />
        );

    return (
        <div className="py-1.5 px-2 rounded-md hover:bg-white/5 transition-colors group">
            <div className="flex items-start gap-2">
                <span className="mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary truncate">{task.label}</p>
                    {task.model && (
                        <p className="text-[10px] text-accent-tertiary truncate">{task.model}</p>
                    )}
                    <div className="flex items-center gap-2">
                        {task.detail && (
                            <p className="text-[10px] text-secondary truncate">{task.detail}</p>
                        )}
                        {task.status === 'running' && (
                            <p className="text-[10px] text-muted shrink-0">
                                {hasProgress ? `${task.progress}%` : `${elapsed}s`}
                            </p>
                        )}
                    </div>
                    {task.status === 'running' && hasProgress && (
                        <ProgressBar value={task.progress!} />
                    )}
                </div>
                <button
                    onClick={onDismissRequest}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-primary shrink-0 mt-0.5"
                    title="Dismiss"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
}

export default function TaskStatusPanel() {
    const { tasks, dismissTask, cancelTask } = useTaskContext();
    const [collapsed, setCollapsed] = useState(false);
    const [pendingDismiss, setPendingDismiss] = useState<Task | null>(null);

    if (tasks.length === 0 && !pendingDismiss) return null;

    const runningCount = tasks.filter(t => t.status === 'running').length;

    const handleDismissRequest = (task: Task) => {
        if (task.status === 'running') {
            setPendingDismiss(task);
        } else {
            dismissTask(task.id);
        }
    };

    return (
        <>
            {pendingDismiss && (
                <DismissConfirmModal
                    task={pendingDismiss}
                    onHide={() => {
                        dismissTask(pendingDismiss.id);
                        setPendingDismiss(null);
                    }}
                    onStop={() => {
                        cancelTask(pendingDismiss.id);
                        setPendingDismiss(null);
                    }}
                    onCancel={() => setPendingDismiss(null)}
                />
            )}

            {tasks.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        zIndex: 60,
                        width: '260px',
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                        }}
                    >
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {runningCount > 0 && (
                                    <Loader2 size={13} className="animate-spin text-accent-secondary" />
                                )}
                                <span className="text-xs font-semibold text-primary">
                                    {runningCount > 0
                                        ? `${runningCount} task${runningCount > 1 ? 's' : ''} running`
                                        : 'Tasks'}
                                </span>
                            </div>
                            {collapsed
                                ? <ChevronUp size={13} className="text-secondary" />
                                : <ChevronDown size={13} className="text-secondary" />}
                        </button>

                        {!collapsed && (
                            <div className="px-1 pb-1 flex flex-col">
                                {tasks.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        onDismissRequest={() => handleDismissRequest(task)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
