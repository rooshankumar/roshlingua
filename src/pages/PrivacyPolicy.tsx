import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
        <p className="mb-4">Last updated: May 15, 2025</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p>
            This Privacy Policy describes how we collect, use, and share your personal information
            when you use our language learning platform. We are committed to protecting your privacy
            and ensuring you understand how your data is handled.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="list-disc pl-6 mt-2 mb-4">
            <li>Account information (name, email, password)</li>
            <li>Profile information (avatar, bio, learning preferences)</li>
            <li>Usage data (interactions, messages, learning progress)</li>
            <li>Technical data (device information, IP address, cookies)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 mt-2 mb-4">
            <li>Provide and improve our language learning services</li>
            <li>Personalize your learning experience</li>
            <li>Enable communication with other language learners</li>
            <li>Analyze usage patterns and optimize our platform</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Sharing Your Information</h2>
          <p>
            We may share your information with third-party service providers who help us operate
            our platform. We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information,
            including the right to access, correct, or delete your data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@example.com.
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Button asChild>
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;