
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Link } from "react-router-dom";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Message sent",
        description: "Thank you for your message. We'll respond shortly.",
        variant: "success"
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: ""
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto p-4 py-8 max-w-3xl">
      <PageHeader 
        title="Contact Us" 
        description="We'd love to hear from you. Send us a message and we'll respond as soon as possible."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>We'll get back to you as soon as possible</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name</label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                <Input 
                  id="subject" 
                  name="subject" 
                  value={formData.subject} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <Textarea 
                  id="message" 
                  name="message" 
                  rows={5} 
                  value={formData.message} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-muted-foreground">support@roshlingua.com</p>
            </div>

            <div>
              <h3 className="font-medium">Support Hours</h3>
              <p className="text-muted-foreground">Monday - Friday<br />9:00 AM - 6:00 PM EST</p>
            </div>

            <div>
              <h3 className="font-medium">Office</h3>
              <p className="text-muted-foreground">
                123 Language Ave<br />
                Suite 456<br />
                New York, NY 10001
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default Contact;
