import React from 'react';
import { ChevronDown, FileText } from 'lucide-react';

interface CustomDropdownProps {
    items: { id: string; title: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    placeholder?: string;
    icon?: React.ReactNode;
}

export default function CustomDropdown({
    items,
    selectedId,
    onSelect,
    isOpen,
    setIsOpen,
    placeholder = 'Select',
    icon
}: CustomDropdownProps) {
    const selectedItem = items.find(i => i.id.toString() === selectedId);

    return (
        <div className="relative">
            <button 
                className="flex items-center gap-2 bg-black/40 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none backdrop-blur-md" 
                onClick={() => setIsOpen(!isOpen)}
            >
                {icon || <FileText size={16} className="text-accent-secondary" />}
                <span>{selectedItem ? selectedItem.title : placeholder}</span>
                <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 bg-[#0f111a] border border-white/10 rounded-lg shadow-xl p-1 z-50 min-w-[180px] animate-fade-in backdrop-blur-lg">
                    {items.map((r: any) => (
                        <button 
                            key={r.id} 
                            className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-white/5 rounded-md transition-all ${r.id.toString() === selectedId ? 'text-accent-primary bg-white/5' : 'text-secondary hover:text-white'}`} 
                            onClick={() => { onSelect(r.id.toString()); setIsOpen(false); }}
                        >
                            {icon || <FileText size={14} className="text-secondary" />}
                            <span>{r.title}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
