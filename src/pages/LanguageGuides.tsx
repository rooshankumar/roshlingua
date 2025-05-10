import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { SUPPORTED_LANGUAGES, getLanguageFlag } from '@/utils/languageUtils';

const LanguageGuides = () => {
  // Filter to show only the most common languages
  const popularLanguages = ["en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko"];

  // Filter the supported languages to get only popular ones
  const languages = SUPPORTED_LANGUAGES.filter(lang => 
    popularLanguages.includes(lang.code)
  );

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Language Learning Guides</h1>

      <Tabs defaultValue="beginner" className="w-full max-w-4xl mx-auto mb-10">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="beginner">Beginner</TabsTrigger>
          <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="beginner" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started with Any Language</CardTitle>
                <CardDescription>Essential tips for absolute beginners</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Learn the fundamental approaches to starting a new language, including
                  building vocabulary, basic grammar concepts, and setting realistic goals.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Read Guide</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Practice Routines</CardTitle>
                <CardDescription>How to build consistent habits</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Discover effective 15-30 minute daily routines that will help you
                  make steady progress without feeling overwhelmed.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Read Guide</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intermediate" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Breaking Through Plateaus</CardTitle>
                <CardDescription>Techniques for intermediate learners</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Learn strategies to overcome common plateaus that occur at the intermediate
                  level and continue making progress in your language journey.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Read Guide</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expanding Your Vocabulary</CardTitle>
                <CardDescription>Beyond the basics</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Techniques for significantly expanding your active vocabulary through
                  thematic learning, context-based acquisition, and spaced repetition.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Read Guide</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mastering Colloquial Speech</CardTitle>
                <CardDescription>Sound like a native speaker</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Advanced techniques for understanding and using idioms, slang,
                  and culturally-specific expressions in natural conversation.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Read Guide</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Language Maintenance</CardTitle>
                <CardDescription>Keeping your skills sharp</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Strategies for maintaining and improving your language skills
                  even when you've reached an advanced level of proficiency.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Read Guide</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Language-Specific Guides</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {languages.map((language) => (
            <Card key={language.code} className="flex flex-col items-center text-center p-4 hover:shadow-md transition-shadow duration-200">
              <div className="text-2xl mb-2">{getLanguageFlag(language.code)}</div>
              <h3 className="font-medium">{language.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {language.nativeName}
              </p>
              <Button variant="outline" size="sm" className="mt-auto">
                View Guide
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <Button asChild variant="outline">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default LanguageGuides;