
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, className }) => {
  const navigate = useNavigate();

  return (
    <div className={`flex flex-col space-y-3 mb-8 ${className}`}>
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mr-2 hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Go back</span>
        </Button>
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
};

export default PageHeader;
