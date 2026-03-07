import React from 'react';
import { ExternalLink, Github, Mail, Globe, MapPin, ShieldCheck } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-500 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent italic">
                                ABIF
                            </h2>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                IIT Kharagpur
                            </p>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">
                            Agri-Business Incubation Foundation (ABIF) at IIT Kharagpur is dedicated to nurturing agri-tech innovations and empowering startups through strategic funding and resources.
                        </p>
                        <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
                            <a href="#" className="hover:text-blue-500 transition-colors"><Mail size={18} /></a>
                            <a href="#" className="hover:text-blue-500 transition-colors"><Github size={18} /></a>
                            <a href="#" className="hover:text-blue-500 transition-colors"><Globe size={18} /></a>
                        </div>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-2 w-fit">
                            Intelligence Hub
                        </h4>
                        <ul className="space-y-3">
                            <li><a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 flex items-center gap-2 group">Market Insights <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                            <li><a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 flex items-center gap-2 group">Agri-Tech Trends <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                            <li><a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 flex items-center gap-2 group">Funding Repository <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                            <li><a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500 flex items-center gap-2 group">Ecosystem Map <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-2 w-fit">
                            Platform Info
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">AI-Verified Funding Links</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">IIT Kharagpur, West Bengal, India</span>
                            </li>
                            <li><a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500">System Status</a></li>
                            <li><a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-500">Contact Team ABIF</a></li>
                        </ul>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Notice of Limitation</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                            All funding opportunities and market insights are generated using autonomous scraping and AI analysis. While we strive for 100% accuracy, users are strictly advised to perform manual due diligence before applying.
                        </p>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold uppercase">Radar Active v2.4</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                        © {currentYear} ABIF IIT Kharagpur. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors">Privacy Policy</a>
                        <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors">Terms of Service</a>
                        <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors">Data Ethics</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
