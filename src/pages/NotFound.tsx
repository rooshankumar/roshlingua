
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const NotFound = () => {
  const location = useLocation();
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [stars, setStars] = useState<Array<{ x: number; y: number; collected: boolean }>>(
    Array.from({ length: 5 }, () => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      collected: false
    }))
  );
  const [score, setScore] = useState(0);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    const handleKeyPress = (e: KeyboardEvent) => {
      setPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;
        
        switch(e.key) {
          case 'ArrowUp':
            newY = Math.max(0, prev.y - 5);
            break;
          case 'ArrowDown':
            newY = Math.min(100, prev.y + 5);
            break;
          case 'ArrowLeft':
            newX = Math.max(0, prev.x - 5);
            break;
          case 'ArrowRight':
            newX = Math.min(100, prev.x + 5);
            break;
        }

        // Check for star collection
        stars.forEach((star, index) => {
          if (!star.collected && 
              Math.abs(star.x - newX) < 5 && 
              Math.abs(star.y - newY) < 5) {
            setStars(prev => prev.map((s, i) => 
              i === index ? { ...s, collected: true } : s
            ));
            setScore(prev => prev + 1);
          }
        });

        return { x: newX, y: newY };
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [location.pathname, stars]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(white, rgba(255,255,255,0) 2px)',
          backgroundSize: '50px 50px'
        }}
      />
      
      <div className="text-center relative z-10">
        <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Lost in Space</p>
        <p className="text-sm text-muted-foreground mb-8">Use arrow keys to explore and collect stars: {score}/5</p>
        
        <div className="relative w-[300px] h-[300px] border border-primary/20 rounded-lg mb-8">
          {/* Player */}
          <div 
            className="absolute w-4 h-4 bg-primary rounded-full transition-all duration-200 animate-pulse"
            style={{ 
              left: `${position.x}%`, 
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
          
          {/* Stars */}
          {stars.map((star, index) => (
            !star.collected && (
              <div 
                key={index}
                className="absolute w-3 h-3 text-yellow-500 animate-pulse-slow"
                style={{ 
                  left: `${star.x}%`, 
                  top: `${star.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                ⭐
              </div>
            )
          ))}
        </div>

        <div className="relative group">
          <a 
            href="/" 
            className="relative inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-primary rounded-full overflow-hidden transition-transform transform hover:scale-105 hover:shadow-xl"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative flex items-center">
              <svg 
                className="w-6 h-6 mr-2 transform transition-transform group-hover:-translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return Home
            </span>
          </a>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
