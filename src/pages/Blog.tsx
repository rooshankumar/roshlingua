
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";

const Blog = () => {
  return (
    <div className="container mx-auto p-4 py-8">
      <PageHeader 
        title="roshLingua Blog" 
        description="Tips, insights, and stories to enhance your language learning journey"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Getting Started with Language Learning</CardTitle>
            <CardDescription>Published on May 8, 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Embarking on a language learning journey can be both exciting and challenging. This guide will help you get started with the right mindset and tools.
            </p>
            <a href="#" className="text-primary hover:underline">Read more</a>
          </CardContent>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle>5 Tips for Consistent Practice</CardTitle>
            <CardDescription>Published on April 22, 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Consistency is key in language learning. Discover five effective strategies to maintain your learning streak and make steady progress.
            </p>
            <a href="#" className="text-primary hover:underline">Read more</a>
          </CardContent>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle>The Benefits of Language Exchange</CardTitle>
            <CardDescription>Published on March 15, 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Language exchange partners can accelerate your learning. Learn how to find the perfect partner and structure your sessions for maximum benefit.
            </p>
            <a href="#" className="text-primary hover:underline">Read more</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Blog;
