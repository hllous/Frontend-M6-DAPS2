import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

type PublicPageHeaderProps = {
  title: string;
  introduction: string;
};

export function PublicPageHeader({ title, introduction }: PublicPageHeaderProps) {
  return (
    <header className="flex flex-col items-start gap-2">
      <Link
        href="/consulta"
        className={buttonVariants({
          variant: "link",
          size: "lg",
          className: "-ml-2 min-h-11 w-fit justify-start px-2",
        })}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Volver a consultas
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[34px]">{title}</h1>
        <p className="max-w-[60ch] text-muted-foreground">{introduction}</p>
      </div>
    </header>
  );
}
