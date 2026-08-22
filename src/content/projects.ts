import { assertUniqueSlugs, projectSchema } from "@/lib/validation/content";
import type { Project } from "@/types/content";

/**
 * Projects, newest first.
 *
 * Migrated from Bidipta's previous site. Summaries and tech stacks are his;
 * the previous site's inconsistent project numbering was dropped.
 *
 * `outcomes` and `challenges` are populated only where something real
 * happened. Bidipta's decision, and the right one: filler in those fields is
 * worse than leaving them blank, because a reader who spots one invented
 * "challenge" discounts everything else on the page. Detail pages omit the
 * sections entirely when they are empty.
 */
export const projects: Project[] = [
  {
    slug: "ecoroute",
    title: "EcoRoute",
    summary:
      "A sensor-driven dashboard mapping 84 waste bins across BU's campus to optimize collection routes and bin placement.",
    description:
      "Built with BU's Team Sustainability to replace guesswork in campus waste collection. Sensor readings from 84 Big Belly bins are combined with City of Boston open data to map every bin, identify hotspots that overflow, and recommend better placement based on foot traffic. A hotspot algorithm drives the collection-timing recommendations, and NextAuth.js gates the dashboard so only BU Sustainability staff can see operational data.",
    role: "Team lead — organized a team of five, delegating dashboard development to two software engineers and the data pipeline to three data scientists, and coordinating the handoffs between them",
    featured: true,
    startedAt: null,
    completedAt: "2026-02",
    tech: ["Next.js", "NextAuth.js", "SQLite", "Data Visualization", "Vercel"],
    repoUrl: null,
    liveUrl: "https://bin-there-done-that-green.vercel.app/",
    outcomes: [
      "First place in the Environmental track and second overall at the 2026 BU Civics Hackathon",
      "Delivered a working product on deadline with a team of five across two disciplines",
      "Cleaned raw CSV feeds from the City of Boston open data portal and BU's bin sensor network into a queryable SQLite database",
    ],
    challenges: [
      "Deploying the live feature went wrong on the day and was not resolved until minutes before the final presentation — the demo went out on a build that had only just started working.",
    ],
  },
  {
    slug: "spotter",
    title: "Spotter",
    summary:
      "A workout tracker for BU students with challenge endpoints, activity feeds, and AI-generated meal plans.",
    description:
      "A Flask application for tracking workouts and competing with other Boston University students. Exposes a RESTful API for challenges and activity feeds, authenticates with JWT, and uses the OpenAI API to generate personalized meal recipes from a user's training history and goals.",
    role: "Designed and built the backend, API, and data model",
    featured: true,
    startedAt: null,
    completedAt: "2025-12",
    tech: ["Python", "Flask", "MongoDB", "OpenAI API", "JWT"],
    repoUrl: "https://github.com/BidiptaRoy",
    liveUrl: null,
    outcomes: [],
    challenges: [],
  },
  {
    slug: "nogi-bjj-trainer",
    title: "No-Gi BJJ Trainer",
    summary:
      "A full-stack Brazilian Jiu Jitsu learning app with 19+ technique modules, live quiz polling, and discussion.",
    description:
      "A learning application for no-gi Brazilian Jiu Jitsu, covering more than nineteen technique modules across six categories. RESTful endpoints back a real-time quiz with live vote aggregation, and a comment system lets training partners discuss techniques alongside the material. MongoDB Atlas stores profiles and comments behind secured API routes; the frontend deploys to Vercel through a CI/CD pipeline with the backend on a Node.js server.",
    role: "Full-stack — data model, API, and interface",
    featured: true,
    startedAt: null,
    completedAt: "2025-11",
    tech: ["React", "Node.js", "Express", "MongoDB", "Tailwind CSS", "Vercel"],
    repoUrl: null,
    liveUrl: "https://bjj-trainer-j37ht700o-bidipta-roys-projects.vercel.app/",
    outcomes: [],
    challenges: [],
  },
  {
    slug: "newise-gis",
    title: "NEWISE GIS",
    summary:
      "An interactive GIS platform mapping income, education, crime, and life expectancy across New England.",
    description:
      "Built for the DS-X Hackathon. Combines public datasets into choropleth maps that let you compare income, education, crime, and life expectancy across New England, using GeoPandas for the spatial joins and Folium and Leaflet for the interactive map layer.",
    role: "Data processing and map visualization",
    featured: true,
    startedAt: null,
    completedAt: "2025-10",
    tech: ["Python", "GeoPandas", "Folium", "Leaflet.js", "Pandas"],
    repoUrl: null,
    liveUrl: "https://atularavinddas.github.io/NEWISE_GIS/",
    outcomes: [],
    challenges: [],
  },
  {
    slug: "f1-red-bull-dashboard",
    title: "F1 Red Bull Dashboard",
    summary:
      "A Formula 1 dashboard pulling live championship data, driver standings, and race results for Red Bull Racing.",
    description:
      "Pulls championship data, driver standings, and race results for Red Bull Racing from the Jolpica F1 API, with charts and historical breakdowns rendered through Recharts.",
    role: null,
    featured: false,
    startedAt: null,
    completedAt: "2025",
    tech: ["Next.js", "React", "styled-components", "Recharts", "MongoDB Atlas", "Axios"],
    repoUrl: null,
    liveUrl: "https://f1-red-bull-dashboard.vercel.app/",
    outcomes: [],
    challenges: [],
  },
  {
    slug: "weather-app",
    title: "Weather App",
    summary:
      "A server-rendered weather app with real-time conditions and seven-day forecasts for any city.",
    description:
      "Server-rendered weather for any city, with current conditions and a seven-day forecast. Next.js API routes wrap the Visual Crossing API so the key never reaches the browser.",
    role: null,
    featured: false,
    startedAt: null,
    completedAt: "2025",
    tech: ["Next.js", "TypeScript", "styled-components", "Visual Crossing API", "Vercel"],
    repoUrl: null,
    liveUrl: "https://mp-4-ebon-nu.vercel.app/Boston",
    outcomes: [],
    challenges: [],
  },
  {
    slug: "gsap-showcase",
    title: "GSAP Showcase",
    summary:
      "An interactive exploration of three GSAP animation patterns: timeline sequencing, scroll reveals, and physics-based motion.",
    description:
      "A deep dive into the GSAP animation library, built as a class extra-credit project. Demonstrates three distinct patterns: timeline sequencing, ScrollTrigger-driven reveals, and physics-based motion.",
    role: null,
    featured: false,
    startedAt: null,
    completedAt: "2025",
    tech: ["React", "GSAP", "styled-components", "Vite"],
    repoUrl: null,
    liveUrl: "https://gsap-extra-credit.vercel.app/",
    outcomes: [],
    challenges: [],
  },
].map((project, index) =>
  projectSchema.parse({ ...project, status: "PUBLISHED", sortOrder: index }),
);

assertUniqueSlugs(projects, "project");
