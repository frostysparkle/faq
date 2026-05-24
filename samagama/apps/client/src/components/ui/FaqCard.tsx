import { Flag } from "lucide-react";
import { Badge } from "./Badge";

interface FaqCardProps {
  id?: string;
  title: string;
  answer: string;
  category: string;
  tags: string[];
  status: string;
  updated: string;
  onOpen?: (id: string) => void;
}

export function FaqCard({
  id,
  title,
  answer,
  category,
  tags,
  status,
  updated,
  onOpen
}: FaqCardProps) {
  const statusTone = status === "Outdated" ? "amber" : "green";
  return (
    <article className="faqCard">
      <h3>{title}</h3>
      <p>{answer}</p>
      <div className="metaLine">
        <Badge tone={statusTone}>{status}</Badge>
        <Badge tone="blue">{category}</Badge>
        {tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
        <span className="pushRight">Updated {updated}</span>
        <button className="iconTextButton" aria-label={`Flag ${title}`}>
          <Flag aria-hidden="true" />
          Flag
        </button>
        {id && onOpen ? (
          <button className="primaryButton compactButton" onClick={() => onOpen(id)}>
            Open
          </button>
        ) : null}
      </div>
    </article>
  );
}
