"use client";

import { useProfile, useSystemStatus } from "@/hooks/use-career-ops";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Globe, Target, DollarSign, CheckCircle2, XCircle, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: statusData } = useSystemStatus();
  const profile = profileData?.data;
  const checks = statusData?.data?.checks;
  const version = statusData?.data?.version;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile, portals, and system configuration</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1" /> Profile</TabsTrigger>
          <TabsTrigger value="system"><Settings className="h-3.5 w-3.5 mr-1" /> System</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          {profileLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !profile ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                <p>No profile found. Create <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">config/profile.yml</code> to get started.</p>
                <p className="text-xs mt-2">Copy from <code className="bg-gray-100 px-1 py-0.5 rounded">config/profile.example.yml</code></p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Candidate Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Candidate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="Name" value={profile.candidate.full_name} />
                    <ReadOnlyField label="Email" value={profile.candidate.email} />
                    <ReadOnlyField label="Location" value={profile.candidate.location} />
                    <ReadOnlyField label="Phone" value={profile.candidate.phone} />
                    <ReadOnlyField label="LinkedIn" value={profile.candidate.linkedin} />
                    <ReadOnlyField label="Portfolio" value={profile.candidate.portfolio_url} />
                    <ReadOnlyField label="GitHub" value={profile.candidate.github} />
                  </div>
                </CardContent>
              </Card>

              {/* Target Roles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Target Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Primary Roles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.target_roles.primary.map((r: string) => (
                        <Badge key={r} variant="secondary">{r}</Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Archetypes</p>
                    <div className="space-y-2">
                      {profile.target_roles.archetypes.map((a: { name: string; level: string; fit: string }) => (
                        <div key={a.name} className="flex items-center gap-2">
                          <Badge variant="secondary" className={
                            a.fit === "primary" ? "bg-emerald-50 text-emerald-700" :
                            a.fit === "secondary" ? "bg-blue-50 text-blue-700" :
                            "bg-gray-50 text-gray-600"
                          }>
                            {a.fit}
                          </Badge>
                          <span className="text-sm text-gray-700">{a.name}</span>
                          <span className="text-xs text-gray-400">{a.level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Compensation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="Target Range" value={profile.compensation.target_range} />
                    <ReadOnlyField label="Minimum" value={profile.compensation.minimum} />
                    <ReadOnlyField label="Currency" value={profile.compensation.currency} />
                    <ReadOnlyField label="Location Flexibility" value={profile.compensation.location_flexibility} />
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Edit <code className="bg-gray-100 px-1 py-0.5 rounded">config/profile.yml</code> directly for full control.
              </p>
            </>
          )}
        </TabsContent>

        <TabsContent value="system" className="mt-4 space-y-4">
          {/* System Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> System Status
                {version && <Badge variant="secondary" className="text-xs">v{version}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checks ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Check label="cv.md" ok={checks.cvExists} />
                  <Check label="config/profile.yml" ok={checks.profileExists} />
                  <Check label="modes/_profile.md" ok={checks.profileMdExists} />
                  <Check label="portals.yml" ok={checks.portalsExists} />
                  <Check label="data/applications.md" ok={checks.applicationsMdExists} />
                  <Check label="data/pipeline.md" ok={checks.pipelineMdExists} />
                  <Check label="templates/states.yml" ok={checks.statesYmlExists} />
                  <Check label="reports/ directory" ok={checks.reportsDir} />
                  <Check label="output/ directory" ok={checks.outputDir} />
                  <Check label="Claude CLI" ok={checks.claudeCLI} />
                </div>
              ) : (
                <Skeleton className="h-32" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-700">{value || <span className="text-gray-300">Not set</span>}</p>
    </div>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
      <span className={`text-sm ${ok ? "text-gray-700" : "text-red-600"}`}>{label}</span>
    </div>
  );
}
