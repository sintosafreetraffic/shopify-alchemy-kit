/**
 * DiscoverPersonaCTA - CTA for users who haven't completed the quiz
 * 
 * Scandinavian design, calm neutral tones
 */

import { Link } from "react-router-dom";

export function DiscoverPersonaCTA() {
  return (
    <section 
      className="rounded-2xl p-7 md:p-10 text-center"
      style={{ 
        backgroundColor: '#F7F7F6',
        border: '1px dashed #D4D4D2',
      }}
    >
      {/* Monoline icon */}
      <div 
        className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="12" r="5" stroke="#A7B4C2" strokeWidth="1.5" fill="none"/>
          <path d="M8 26C8 22 11.5 19 16 19C20.5 19 24 22 24 26" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M22 8L26 4M26 4V8M26 4H22" stroke="#A7B4C2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h3 
        className="text-xl font-medium mb-2"
        style={{ color: '#2D3436' }}
      >
        Discover Your Sleeper Type
      </h3>
      
      <p 
        className="text-base leading-relaxed max-w-md mx-auto mb-6"
        style={{ color: '#636E72' }}
      >
        Complete a short assessment to unlock your personalized sleep profile and AI coaching recommendations.
      </p>

      <Link to="/sleep-quiz?returnTo=/sleep-coach">
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium transition-all hover:opacity-90"
          style={{
            backgroundColor: '#2D3436',
            color: '#FFFFFF',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Start Sleep Assessment
        </button>
      </Link>
    </section>
  );
}
