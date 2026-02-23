"use client";

import { Users } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Meine Klienten</h1>
          <p className="text-muted-foreground">Klienten aus deinen Schichten</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bald verfügbar</CardTitle>
          <CardDescription>
            Die Liste deiner zugewiesenen Klienten wird hier angezeigt. Sie wird aus deinen Schichten geladen.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
