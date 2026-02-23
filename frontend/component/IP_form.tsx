'use client';

import { useState } from 'react';

// Initial tools based on your design document
const INITIAL_TOOLS = [
    {
        id: '1',
        name: 'Nmap',
        description: 'Nmap is a versatile network scanning tool that identifies devices on a network and provides detailed information about their status and security.' /* [cite: 36] */,
        commands: [
            { label: 'Basic Scan', template: 'nmap <IP>' } /* [cite: 14] */,
            { label: 'Default Script', template: 'nmap <IP> -sC -sV' } /* [cite: 15, 16] */,
        ],
    },
    {
        id: '2',
        name: 'Gobuster',
        description: 'Gobuster efficiently discovers hidden directories and files on web servers, enhancing your reconnaissance capabilities with its rapid scanning techniques.' /* [cite: 30] */,
        commands: [
            { label: 'Basic Scan (DIR)', template: 'gobuster -u <IP> -w <PATH>' } /* [cite: 11, 12] */,
        ],
    },
    {
        id: '3',
        name: 'ffuf',
        description: 'FFUF is a powerful fuzzing tool that allows users to find vulnerabilities and test security by discovering hidden elements on websites quickly.' /* [cite: 32, 33, 34] */,
        commands: [
            { label: 'Basic Scan', template: 'ffuf -w <wordlist> -u <IP>/FUZZ' } /* [cite: 22, 23] */,
        ],
    }
];

export default function IP_Form() {
    const [ip, setIp] = useState('');
    const [tools, setTools] = useState(INITIAL_TOOLS);

    // State for the "Add Tool" form
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newTool, setNewTool] = useState({ name: '', description: '', commandLabel: '', commandTemplate: '' });

    // Copies command to clipboard
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // You could add a toast notification here later!
    };

    // Handles adding a custom tool
    const handleAddTool = (e: React.FormEvent) => {
        e.preventDefault();
        const tool = {
            id: Date.now().toString(),
            name: newTool.name,
            description: newTool.description,
            commands: [{ label: newTool.commandLabel, template: newTool.commandTemplate }]
        };
        setTools([...tools, tool]);
        setNewTool({ name: '', description: '', commandLabel: '', commandTemplate: '' });
        setIsAddingMode(false);
    };

    // Replaces <IP> in the template with the user's actual input
    const renderCommand = (template: string) => {
        const target = ip.trim() || '<IP>';
        return template.replace(/<IP>/g, target);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans">
            {/* Header Section */}
            <div className="max-w-6xl mx-auto mb-12 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-4 tracking-tight">
                    TOOLKIT {/*  */}
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl">
                    Empower your productivity and streamline your command execution with ToolKit, the ultimate tool for efficient IP command management and execution. {/* [cite: 27] */}
                </p>
            </div>

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Top Bar: Search & Actions */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
                    <div className="flex-1 w-full relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-emerald-500 font-bold">
                            TARGET IP &gt;
                        </div>
                        <input
                            type="text"
                            placeholder="Enter IP: <IP> / (IP:PORTNUMBER)" /*  */
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-lg rounded-xl py-4 pl-32 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddingMode(!isAddingMode)}
                        className="w-full md:w-auto px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition-colors whitespace-nowrap"
                    >
                        {isAddingMode ? 'Cancel' : '+ Add tool and command'} {/*  */}
                    </button>
                </div>

                {/* Add New Tool Form (Toggled) */}
                {isAddingMode && (
                    <form onSubmit={handleAddTool} className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/30 shadow-2xl animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-xl font-bold mb-4 text-emerald-400">Add Custom Tool</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input required placeholder="Tool Name (e.g. Nikto)" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" value={newTool.name} onChange={e => setNewTool({ ...newTool, name: e.target.value })} />
                            <input required placeholder="Short Description" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" value={newTool.description} onChange={e => setNewTool({ ...newTool, description: e.target.value })} />
                            <input required placeholder="Command Label (e.g. Full Scan)" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" value={newTool.commandLabel} onChange={e => setNewTool({ ...newTool, commandLabel: e.target.value })} />
                            <input required placeholder="Command (use <IP> for target)" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono" value={newTool.commandTemplate} onChange={e => setNewTool({ ...newTool, commandTemplate: e.target.value })} />
                        </div>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold w-full md:w-auto">Save Tool</button>
                    </form>
                )}

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tools.map((tool) => (
                        <div key={tool.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-colors flex flex-col h-full">
                            <h2 className="text-2xl font-bold text-cyan-400 mb-2">{tool.name}</h2>
                            <p className="text-slate-400 text-sm mb-6 flex-grow">{tool.description}</p>

                            <div className="space-y-4">
                                {tool.commands.map((cmd, idx) => {
                                    const finalCommand = renderCommand(cmd.template);
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cmd.label}</span>
                                            <div className="flex items-center gap-2 group">
                                                <code className="flex-1 block bg-slate-950 text-emerald-300 p-3 rounded-lg border border-slate-800 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                                    {finalCommand}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(finalCommand)}
                                                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all opacity-80 group-hover:opacity-100"
                                                    title="Copy to clipboard"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}