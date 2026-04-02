import { Lightbulb } from "lucide-react";

interface RecommendationsProps {
  items: string[];
}

const Recommendations = ({ items }: RecommendationsProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 overflow-hidden">
      <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-warning" />
        AI Recommendations
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
          >
            <span className="text-primary mt-0.5 text-xs">▸</span>
            <span className="text-xs sm:text-sm text-foreground break-words min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Recommendations;
