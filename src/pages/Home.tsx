
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { 
  Globe, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Check, 
  ChevronRight 
} from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gradient">
            roshLingua
          </Link>
          
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link to="/privacy-policy" className="text-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </nav>
            
            <ModeToggle />
            
            <div className="flex space-x-2">
              <Button asChild variant="ghost">
                <Link to="/auth">
                  Sign In
                </Link>
              </Button>
              <Button asChild>
                <Link to="/auth?mode=signup">
                  Sign Up
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              A Better Way To Learn Languages
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Connect, Converse, <span className="text-gradient">Perfect Your Language</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Join our vibrant community of language learners. Practice with native speakers, track your progress, and achieve fluency faster than ever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="button-hover">
                <Link to="/auth?mode=signup">
                  Start Learning Now
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="button-hover">
                <Link to="/auth">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 relative">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary rounded-lg flex items-center justify-center">
              <div className="text-4xl animate-pulse-slow">🌍</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features */}
      <section className="py-20 px-6 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How roshLingua Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform combines social networking with proven language learning techniques to help you achieve fluency faster.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="glass-card p-6 rounded-xl card-hover">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Community</h3>
              <p className="text-muted-foreground">
                Connect with language learners and native speakers from around the world.
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl card-hover">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real Conversations</h3>
              <p className="text-muted-foreground">
                Practice your speaking and writing skills in authentic conversations.
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl card-hover">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Language Partners</h3>
              <p className="text-muted-foreground">
                Find the perfect language exchange partner based on your goals.
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl card-hover">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-muted-foreground">
                Monitor your improvement with streaks and achievement metrics.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Success Stories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how roshLingua has helped people achieve their language learning goals.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mr-4">
                  <span className="font-bold">MS</span>
                </div>
                <div>
                  <h4 className="font-semibold">Maria S.</h4>
                  <p className="text-sm text-muted-foreground">Spanish Learner</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "I've tried many language apps, but nothing compares to practicing with native speakers. After 3 months, I can hold real conversations in Spanish!"
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mr-4">
                  <span className="font-bold">JK</span>
                </div>
                <div>
                  <h4 className="font-semibold">James K.</h4>
                  <p className="text-sm text-muted-foreground">Japanese Learner</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "The daily streak feature keeps me motivated. I've maintained a 64-day streak and my Japanese has improved dramatically!"
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mr-4">
                  <span className="font-bold">LT</span>
                </div>
                <div>
                  <h4 className="font-semibold">Lisa T.</h4>
                  <p className="text-sm text-muted-foreground">French Learner</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "I found an amazing language partner from Paris. We chat weekly and help each other with our respective languages. It's been invaluable!"
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start Your Language Journey Today</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of successful language learners on roshLingua. Set up your profile in minutes and start connecting with native speakers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="button-hover">
              <Link to="/auth?mode=signup">
                Create Your Free Account
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="button-hover">
              <Link to="/auth">
                Sign In
              </Link>
            </Button>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-6">
            <div className="flex items-center">
              <Check className="text-primary mr-2 h-5 w-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center">
              <Check className="text-primary mr-2 h-5 w-5" />
              <span>Free core features</span>
            </div>
            <div className="flex items-center">
              <Check className="text-primary mr-2 h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link></li>
                <li><Link to="/auth?mode=signup" className="text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link></li>
                <li><Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Language Guides</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Instagram</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Facebook</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} roshLingua. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
