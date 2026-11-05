import Link from "next/link";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { serviceSourceHref } from "@/lib/referrals";
import type { Service } from "@/lib/services";

export function InFlightServiceBadge({ service }: { service: Service }) {
  return <Badge variant="info" className="w-fit max-w-full" render={<Link href={serviceSourceHref(service.id)} />}><Clock data-icon="inline-start" aria-hidden />Servicio en curso: {service.title}</Badge>;
}
