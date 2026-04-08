"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase, MapPin, DollarSign, Star, Globe, Plus, X, SlidersHorizontal,
} from "lucide-react";
import type { SearchConfig, AuthStatus } from "@/lib/types";

const ALL_ROLES = [
  "Engineering", "AI", "Product", "Strategy", "Sales", "Consulting",
  "Data", "Design", "Marketing", "Operations", "Finance", "Legal",
];

const ALL_SENIORITY = [
  "C-Level", "VP", "Director", "Head of", "Principal", "Staff", "Senior", "Lead", "Mid",
];

const ALL_JOB_TYPES = ["Full-time", "Contract", "Part-time", "Freelance"];

const COMMON_LOCATIONS = [
  "Remote", "US", "EU", "UK", "Canada", "India", "APAC",
  "San Francisco", "New York", "London", "Berlin", "Singapore", "Hyderabad",
];

interface Props {
  config: SearchConfig;
  onChange: (config: SearchConfig) => void;
  authStatus?: AuthStatus;
  onLogin?: (platform: string) => void;
  compact?: boolean;
}

export function SearchControlPanel({ config, onChange, authStatus, onLogin, compact }: Props) {
  const [keywordInput, setKeywordInput] = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const update = useCallback(
    (partial: Partial<SearchConfig>) => onChange({ ...config, ...partial }),
    [config, onChange]
  );

  const toggleChip = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const addTag = (key: "keywords" | "excludeKeywords" | "locations", val: string, clear: () => void) => {
    const trimmed = val.trim();
    if (!trimmed || config[key].includes(trimmed)) return;
    update({ [key]: [...config[key], trimmed] });
    clear();
  };

  return (
    <div className="space-y-4">
      {/* Roles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5" /> Target Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => update({ roles: toggleChip(config.roles, role) })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  config.roles.includes(role)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Experience + Seniority */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-3.5 w-3.5" /> Experience (Years)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Overall: {config.experienceMin}–{config.experienceMax} yrs</span>
              </div>
              <Slider
                value={[config.experienceMin, config.experienceMax]}
                onValueChange={(v) => { const a = Array.isArray(v) ? v : [v]; update({ experienceMin: a[0], experienceMax: a[1] ?? a[0] }); }}
                min={0}
                max={25}
                step={1}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Domain-specific: {config.roleExperienceMin}+ yrs</span>
              </div>
              <Slider
                value={[config.roleExperienceMin]}
                onValueChange={(v) => update({ roleExperienceMin: Array.isArray(v) ? v[0] : v })}
                min={0}
                max={20}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-3.5 w-3.5" /> Seniority Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SENIORITY.map((s) => (
                <button
                  key={s}
                  onClick={() => update({ seniority: toggleChip(config.seniority, s) })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    config.seniority.includes(s)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location + Job Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {COMMON_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => update({ locations: toggleChip(config.locations, loc) })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    config.locations.includes(loc)
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Add custom location..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTag("locations", locationInput, () => setLocationInput(""));
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => addTag("locations", locationInput, () => setLocationInput(""))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5" /> Job Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {ALL_JOB_TYPES.map((jt) => (
                <button
                  key={jt}
                  onClick={() => update({ jobType: toggleChip(config.jobType, jt) })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    config.jobType.includes(jt)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {jt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary + Sources */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" /> Minimum Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>${(config.salaryMin / 1000).toFixed(0)}k+</span>
              <span>$500k</span>
            </div>
            <Slider
              value={[config.salaryMin]}
              onValueChange={(v) => update({ salaryMin: Array.isArray(v) ? v[0] : v })}
              min={0}
              max={500000}
              step={10000}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Job Board Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["linkedin", "indeed", "glassdoor", "greenhouse"] as const).map((src) => (
                <div key={src} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.sources[src]}
                      onCheckedChange={(v) =>
                        update({ sources: { ...config.sources, [src]: v } })
                      }
                    />
                    <span className="text-sm capitalize">{src}</span>
                  </div>
                  {src !== "greenhouse" && authStatus && (
                    authStatus[src]?.authenticated ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                        Connected
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => onLogin?.(src)}
                      >
                        Connect
                      </Button>
                    )
                  )}
                  {src === "greenhouse" && (
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">
                      API
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Keywords
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-2">Include (matches any)</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {kw}
                  <button
                    onClick={() => update({ keywords: config.keywords.filter((k) => k !== kw) })}
                    className="hover:text-red-600"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add keyword..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTag("keywords", keywordInput, () => setKeywordInput(""));
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => addTag("keywords", keywordInput, () => setKeywordInput(""))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-gray-500 mb-2">Exclude</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {config.excludeKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200"
                >
                  {kw}
                  <button
                    onClick={() =>
                      update({ excludeKeywords: config.excludeKeywords.filter((k) => k !== kw) })
                    }
                    className="hover:text-red-900"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                placeholder="Add exclude keyword..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTag("excludeKeywords", excludeInput, () => setExcludeInput(""));
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => addTag("excludeKeywords", excludeInput, () => setExcludeInput(""))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
