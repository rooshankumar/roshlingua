
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto p-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Privacy Policy</h1>
      
      <Card>
        <CardContent className="p-6 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p>
              At roshLingua, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our language learning platform.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-2">Personal Information</h3>
                <p>
                  We may collect personal information that you voluntarily provide when creating an account, such as your name, email address, profile picture, and language preferences.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Usage Data</h3>
                <p>
                  We automatically collect certain information about how you interact with our platform, including your learning activities, achievements, chat conversations, and usage patterns.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Device Information</h3>
                <p>
                  We may collect information about the device you use to access our platform, including device type, operating system, browser type, and IP address.
                </p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our language learning platform</li>
              <li>To personalize your learning experience</li>
              <li>To match you with appropriate language exchange partners</li>
              <li>To track your progress and provide feedback</li>
              <li>To communicate with you about updates, features, and offers</li>
              <li>To improve our platform and develop new features</li>
              <li>To detect, prevent, and address technical issues or abuse</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>With other users, as necessary for the language exchange functionality</li>
              <li>With service providers who assist us in operating our platform</li>
              <li>To comply with legal obligations</li>
              <li>With your consent or at your direction</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, so we cannot guarantee absolute security.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Privacy Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Right to access and receive a copy of your personal information</li>
              <li>Right to correct inaccurate information</li>
              <li>Right to delete your personal information</li>
              <li>Right to restrict or object to processing</li>
              <li>Right to data portability</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              Email: privacy@roshlingua.com<br />
              Address: 123 Language Ave, Suite 456, New York, NY 10001
            </p>
          </section>
          
          <div className="text-right text-sm text-muted-foreground mt-8">
            Last updated: May 1, 2025
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
