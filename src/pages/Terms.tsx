
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="w-full py-4 px-6 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gradient">
            Languagelandia
          </Link>
          
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using Languagelandia, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
            
            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily access the materials (information or software) on Languagelandia's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software contained on Languagelandia's website</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
            
            <h2>3. User Accounts</h2>
            <p>
              When you create an account with us, you guarantee that:
            </p>
            <ul>
              <li>You are above the age of 13</li>
              <li>The information you provide us is accurate, complete, and current at all times</li>
              <li>You are responsible for maintaining the confidentiality of your account and password</li>
              <li>You accept responsibility for all activities that occur under your account</li>
            </ul>
            
            <h2>4. Acceptable Use</h2>
            <p>
              You agree not to use Languagelandia for any purpose that is unlawful or prohibited by these Terms. You may not use the Service in any manner that could damage, disable, overburden, or impair the Service.
            </p>
            
            <h2>5. Content Guidelines</h2>
            <p>
              Users are responsible for all content they post or share through the Service. Content must not:
            </p>
            <ul>
              <li>Be unlawful, harmful, threatening, abusive, harassing, defamatory, or invasive of privacy</li>
              <li>Infringe any patent, trademark, trade secret, copyright, or other intellectual property</li>
              <li>Contain software viruses or any other malicious code</li>
              <li>Impersonate any person or entity</li>
            </ul>
            
            <h2>6. Subscription and Payment</h2>
            <p>
              Some features of the Service require a subscription. By subscribing to a paid plan:
            </p>
            <ul>
              <li>You agree to pay all fees charged to your account</li>
              <li>Subscriptions will automatically renew unless cancelled</li>
              <li>Refunds are subject to our refund policy</li>
            </ul>
            
            <h2>7. Intellectual Property</h2>
            <p>
              The Service and its original content (excluding user-generated content), features, and functionality are and will remain the exclusive property of Languagelandia and its licensors.
            </p>
            
            <h2>8. Disclaimer</h2>
            <p>
              The materials on Languagelandia's website are provided on an 'as is' basis. Languagelandia makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
            
            <h2>9. Limitation of Liability</h2>
            <p>
              In no event shall Languagelandia or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Languagelandia's website.
            </p>
            
            <h2>10. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
            
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul>
              <li>By email: terms@languagelandia.com</li>
              <li>By visiting our contact page: <Link to="/contact" className="text-primary hover:underline">Contact Us</Link></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Terms;
