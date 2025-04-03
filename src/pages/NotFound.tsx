import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CARDS = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭', '🎪', '🎨', '🎭', '🎮', '🎲', '🎯'];

const NotFound = () => {
  const location = useLocation();
  const [cards, setCards] = useState(CARDS.sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  useEffect(() => {
    if (flipped.length === 2) {
      setMoves(m => m + 1);
      if (cards[flipped[0]] === cards[flipped[1]]) {
        setMatched([...matched, ...flipped]);
        setFlipped([]);
      } else {
        const timeoutId = setTimeout(() => setFlipped([]), 1000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [flipped, cards, matched]);

  const handleCardClick = (index: number) => {
    if (flipped.length < 2 && !flipped.includes(index) && !matched.includes(index)) {
      setFlipped([...flipped, index]);
    }
  };

  const resetGame = () => {
    setCards(CARDS.sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/50">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
            404
          </h1>
          <p className="text-xl text-muted-foreground mb-2">Page Not Found</p>
          <p className="text-sm text-muted-foreground">
            Find matching pairs to unlock the way back home! Moves: {moves}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 p-4 max-w-xs mx-auto">
          {cards.map((card, index) => (
            <div
              key={index}
              onClick={() => handleCardClick(index)}
              className={`
                w-16 h-16 flex items-center justify-center text-2xl 
                rounded-lg cursor-pointer transform transition-all duration-300
                ${flipped.includes(index) || matched.includes(index)
                  ? 'bg-primary/20 rotate-0'
                  : 'bg-primary rotate-180'
                }
                ${matched.includes(index) ? 'opacity-50' : 'hover:scale-105'}
              `}
            >
              {(flipped.includes(index) || matched.includes(index)) ? card : ''}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Button
            onClick={resetGame}
            variant="outline"
            className="gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle Cards
          </Button>

          <div className="block">
            <a
              href="/"
              className="text-primary hover:text-primary/80 underline text-sm"
            >
              Return Home
            </a>
          </div>
        </div>

        {matched.length === cards.length && (
          <div className="animate-fade-up">
            <p className="text-lg font-medium text-primary">
              Congratulations! You won in {moves} moves!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;