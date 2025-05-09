
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LanguageGuides = () => {
  return (
    <div className="container mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Language Learning Guides</h1>
      
      <Tabs defaultValue="beginner" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="beginner">Beginner</TabsTrigger>
          <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="beginner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spanish for Beginners</CardTitle>
              </CardHeader>
              <CardContent>
                <p>A comprehensive guide to getting started with Spanish, including basic greetings, pronunciation, and essential vocabulary.</p>
                <a href="#" className="text-primary hover:underline mt-4 inline-block">Read guide</a>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>French Basics</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Learn the fundamentals of French language, including pronunciation guidance, basic grammar rules, and everyday phrases.</p>
                <a href="#" className="text-primary hover:underline mt-4 inline-block">Read guide</a>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="intermediate">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversational German</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Take your German to the next level with this guide focused on practical conversations, idioms, and natural expressions.</p>
                <a href="#" className="text-primary hover:underline mt-4 inline-block">Read guide</a>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Italian Grammar Deep Dive</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Master Italian verb conjugations, tenses, and complex sentence structures to elevate your language proficiency.</p>
                <a href="#" className="text-primary hover:underline mt-4 inline-block">Read guide</a>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="advanced">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Japanese Business Language</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Specialized vocabulary and etiquette for professional settings in Japanese, including formal speech patterns and business customs.</p>
                <a href="#" className="text-primary hover:underline mt-4 inline-block">Read guide</a>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Mandarin Literature Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Explore classic and contemporary Chinese literature with advanced vocabulary, cultural context, and literary analysis techniques.</p>
                <a href="#" className="text-primary hover:underline mt-4 inline-block">Read guide</a>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LanguageGuides;
