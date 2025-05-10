
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FAQ = () => {
  // Sample FAQ items
  const faqItems = [
    {
      question: "How do I find language exchange partners?",
      answer: "You can find language exchange partners by using the Community section of our platform. Browse through profiles of users who speak the language you're learning and are learning your native language. Then send them a message to start a conversation!"
    },
    {
      question: "What is the best way to practice speaking?",
      answer: "The best way to practice speaking is through regular conversation with native speakers or other learners. Our platform offers chat features where you can practice through text and voice messages. We recommend setting up regular practice sessions to maintain consistency."
    },
    {
      question: "How many minutes per day should I practice?",
      answer: "Consistent daily practice is more important than long study sessions. We recommend at least 15-30 minutes of focused practice every day. Small, consistent efforts lead to better long-term results than occasional marathon sessions."
    },
    {
      question: "How do I track my progress?",
      answer: "You can track your progress through your Dashboard, which shows your learning streak, XP points earned, and achievements unlocked. This gives you visual feedback on your consistency and improvement over time."
    },
    {
      question: "Can I learn multiple languages at once?",
      answer: "While it's possible to learn multiple languages simultaneously, we recommend focusing on one language until you reach at least an intermediate level before adding another. This helps avoid confusion and allows for more rapid progress in each language."
    },
    {
      question: "How do I change my learning language?",
      answer: "You can change your learning language in the Settings page. Navigate to Settings > Profile > Language Settings and select your new target language from the dropdown menu."
    },
    {
      question: "What if I miss a day of practice?",
      answer: "Missing a day occasionally is normal! Our streak system has a 'streak freeze' feature that protects your streak for one day of inactivity. Just remember to get back to your practice as soon as possible to maintain your learning momentum."
    },
    {
      question: "How do I report inappropriate behavior?",
      answer: "If you encounter inappropriate behavior from another user, you can report it by clicking the three dots menu in the chat interface and selecting 'Report User'. Our moderation team will review the report and take appropriate action."
    }
  ];

  return (
    <div className="container mx-auto p-4 py-8 max-w-3xl">
      <PageHeader 
        title="Frequently Asked Questions" 
        description="Find answers to common questions about our platform"
      />

      <Card className="shadow-md">
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <div className="max-w-3xl mx-auto mt-10 text-center">
        <h2 className="text-xl font-semibold mb-4">Still have questions?</h2>
        <p className="mb-6">
          Our support team is here to help with any other questions you might have.
        </p>
        <Button asChild className="mr-4">
          <Link to="/contact">Contact Support</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default FAQ;
