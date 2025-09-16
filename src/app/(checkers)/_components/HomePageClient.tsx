"use client";

import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";

export function QuickStats() {
  const { data: quickStats, isLoading: statsLoading } =
    api.user.getQuickStats.useQuery();

  return (
    <div className="mt-8 grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {statsLoading
              ? "—"
              : (quickStats?.activePlayers?.toLocaleString() ?? "0")}
          </div>
          <div className="text-xs text-gray-600">Active Players</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {statsLoading
              ? "—"
              : (quickStats?.gamesToday?.toLocaleString() ?? "0")}
          </div>
          <div className="text-xs text-gray-600">Games Today</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {statsLoading
              ? "—"
              : (quickStats?.onlineNow?.toLocaleString() ?? "0")}
          </div>
          <div className="text-xs text-gray-600">Online Now</div>
        </CardContent>
      </Card>
    </div>
  );
}