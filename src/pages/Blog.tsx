
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
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Blog = () => {
  // Sample blog posts data
  const blogPosts = [
    {
      id: 1,
      title: "5 Tips to Improve Your Language Learning",
      excerpt: "Discover effective strategies to enhance your language learning journey and achieve fluency faster.",
      date: "May 10, 2025",
      author: "Alex Johnson",
      category: "Learning Tips",
      readTime: "5 min read"
    },
    {
      id: 2,
      title: "The Benefits of Language Exchange",
      excerpt: "Learn how connecting with native speakers can accelerate your language acquisition and cultural understanding.",
      date: "May 5, 2025",
      author: "Maria Garcia",
      category: "Language Practice",
      readTime: "7 min read"
    },
    {
      id: 3,
      title: "Mastering Pronunciation: A Complete Guide",
      excerpt: "Improve your accent and sound more like a native speaker with these pronunciation techniques.",
      date: "April 28, 2025",
      author: "Thomas Lee",
      category: "Pronunciation",
      readTime: "8 min read"
    },
    {
      id: 4,
      title: "How to Stay Motivated When Learning a Language",
      excerpt: "Practical strategies to maintain your motivation and consistency in your language learning journey.",
      date: "April 20, 2025",
      author: "Sarah Wilson",
      category: "Motivation",
      readTime: "6 min read"
    }
  ];

  return (
    <div className="container mx-auto py-12 px-4">
      <header className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Language Learning Blog</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover expert tips, learning strategies, and inspiring stories to enhance your language learning journey.
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogPosts.map((post) => (
          <Card key={post.id} className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{post.category}</span>
                <span className="text-sm text-muted-foreground">{post.readTime}</span>
              </div>
              <CardTitle className="text-xl">{post.title}</CardTitle>
              <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="h-40 bg-muted rounded-md mb-4 flex items-center justify-center">
                <span className="text-muted-foreground">Blog Image</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span>{post.date} • {post.author}</span>
              </div>
              <Button size="sm" variant="outline">Read More</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <Button asChild variant="outline" className="mr-4">
          <Link to="/language-guides">Language Guides</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default Blog;
