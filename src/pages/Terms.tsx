import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";

const Terms = () => {
  return (
    <div className="container mx-auto p-4 py-8 max-w-4xl">
      <PageHeader 
        title="Terms of Service" 
        description="Please read our terms of service carefully"
      />

      <Card className="shadow-md">
        <CardContent className="p-6 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p>
              By accessing or using roshLingua, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Use License</h2>
            <p>
              Permission is granted to temporarily access and use roshLingua for personal, non-commercial use. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software contained on roshLingua</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
            <p>
              When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Content</h2>
            <p>
              Our platform allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material. You retain any rights that you may have in your User Content, but you grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, publish, transmit, and display User Content.
            </p>
            <p className="mt-2">
              You are responsible for your User Content and represent that it does not violate any third party's rights or any applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Prohibited Activities</h2>
            <p>
              You agree not to engage in any of the following activities:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Violating any applicable laws or regulations</li>
              <li>Posting unauthorized or unsolicited advertising</li>
              <li>Impersonating another person or entity</li>
              <li>Interfering with or disrupting the platform</li>
              <li>Engaging in any harassing, abusive, or harmful behavior</li>
              <li>Using the platform for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
            <p>
              The materials on roshLingua are provided on an 'as is' basis. roshLingua makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitations</h2>
            <p>
              In no event shall roshLingua or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on roshLingua, even if roshLingua or a roshLingua authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p>
              roshLingua may revise these terms of service at any time without notice. By using this platform, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of the United States and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
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

export default Terms;