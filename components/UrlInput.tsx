import React, { useState } from 'react';
import { ArrowRight, Globe, Loader2 } from 'lucide-react';

interface UrlInputProps {
  onUrlSubmit: (url: string) => void;
  isLoading: boolean;
}

const UrlInput: React.FC<UrlInputProps> = ({ onUrlSubmit, isLoading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUrlSubmit(url);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
          WebTalk AI
        </h1>
        <p className="text-slate-400 text-lg">
          Geben Sie eine Webadresse ein und unterhalten Sie sich live darüber.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-slate-900 rounded-lg p-2">
          <Globe className="w-6 h-6 text-slate-400 ml-3" />
          <input
            type="url"
            className="w-full bg-transparent text-white border-none focus:ring-0 px-4 py-3 placeholder-slate-500"
            placeholder="https://example.com/article..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[3rem]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
      
      {/* Sample Links */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold w-full text-center mb-2">Beispiele ausprobieren</span>
         <button onClick={() => setUrl('https://en.wikipedia.org/wiki/Artificial_intelligence')} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors">
            Wikipedia: AI
         </button>
         <button onClick={() => setUrl('https://www.nasa.gov/')} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors">
            NASA
         </button>
      </div>
    </div>
  );
};

export default UrlInput;
