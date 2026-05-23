import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Button asChild>
          <Link to="/">Return to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
