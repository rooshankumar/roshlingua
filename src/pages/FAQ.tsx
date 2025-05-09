
import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <div className="container mx-auto p-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>How does roshLingua help me learn languages?</AccordionTrigger>
          <AccordionContent>
            roshLingua combines social language exchange with gamified learning techniques. You can practice with native speakers, track your progress with achievements, and maintain motivation through our streaks and rewards system.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-2">
          <AccordionTrigger>Is roshLingua free to use?</AccordionTrigger>
          <AccordionContent>
            roshLingua offers a free tier with core features. Premium features are available through a subscription plan that unlocks additional learning resources, unlimited chat translations, and advanced progress analytics.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-3">
          <AccordionTrigger>How do I find language partners?</AccordionTrigger>
          <AccordionContent>
            Our community section helps you find language partners based on your native language and the language you're learning. You can also filter by interests to find partners who share similar hobbies or professions.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-4">
          <AccordionTrigger>What languages are supported?</AccordionTrigger>
          <AccordionContent>
            roshLingua currently supports 15 major languages including English, Spanish, French, German, Japanese, Chinese (Mandarin), Italian, Portuguese, Russian, Korean, Arabic, Dutch, Turkish, Polish, and Hindi.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-5">
          <AccordionTrigger>How is my progress tracked?</AccordionTrigger>
          <AccordionContent>
            Your learning progress is tracked through XP points earned from activities like messaging, completing challenges, maintaining streaks, and participating in community events. Achievements are unlocked as you reach milestones.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-6">
          <AccordionTrigger>Can I use roshLingua on mobile devices?</AccordionTrigger>
          <AccordionContent>
            Yes, roshLingua is fully responsive and works on all devices. Our progressive web app can be installed on your home screen for a native app-like experience on both iOS and Android devices.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FAQ;
