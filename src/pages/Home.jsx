import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import HeroSearch from "../components/home/HeroSearch";
import PopularSearches from "../components/home/PopularSearches";
import PopularCities from "../components/home/PopularCities";
import LatestJobs from "../components/home/LatestJobs";
import CompanyCTA from "../components/home/CompanyCTA";

export default function Home() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["latest-jobs"],
    queryFn: () => base44.entities.JobOffer.list("-created_date", 8),
    initialData: [],
  });

  return (
    <div>
      <HeroSearch />
      <LatestJobs jobs={jobs} isLoading={isLoading} />
      <PopularSearches />
      <div className="border-t border-gray-100" />
      <PopularCities />
      <CompanyCTA />
    </div>
  );
}