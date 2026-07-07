/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import TerminatorVision from './components/TerminatorVision';

const App: React.FC = () => {
  return (
    <main className="bg-black text-white min-h-screen flex flex-col items-center font-mono p-4 overflow-hidden">
      {/* Return Button Header */}
      <div className="w-full max-w-4xl pt-4 pb-8 flex justify-start">
        <a 
          href="https://aicosplaygen-com-503671477837.us-west1.run.app"
          className="inline-flex items-center gap-2 border-2 border-red-600 px-4 py-2 hover:bg-red-600 hover:text-black transition-all duration-300 group shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest leading-none">Return to AI Cosplay Gen</span>
        </a>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <TerminatorVision />
      </div>
    </main>
  );
};

export default App;
