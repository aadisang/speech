import { createFileRoute } from "@tanstack/react-router";
import { AudioFeedback } from "@/components/audio-feedback";
import {
  SITE_CREATOR,
  SITE_CREATOR_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

const pageTitle = `${SITE_TITLE} | ${SITE_NAME}`;
const socialImage = `${SITE_URL}/opengraph-image-v2.png`;
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${SITE_URL}/#website`,
      "@type": "WebSite",
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@id": `${SITE_URL}/#web-application`,
      "@type": "WebApplication",
      applicationCategory: "HealthApplication",
      browserRequirements: "Requires microphone access and the Web Audio API",
      description: SITE_DESCRIPTION,
      featureList: [
        "Adjustable audio delay",
        "Live volume control",
        "Switchable microphone inputs",
        "On-device microphone processing",
      ],
      inLanguage: "en-US",
      isAccessibleForFree: true,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      name: SITE_TITLE,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      operatingSystem: "Any",
      url: SITE_URL,
    },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { href: SITE_URL, rel: "canonical" },
      { href: SITE_URL, hrefLang: "en-US", rel: "alternate" },
      { href: SITE_URL, hrefLang: "x-default", rel: "alternate" },
    ],
    meta: [
      { title: pageTitle },
      { content: SITE_DESCRIPTION, name: "description" },
      { content: SITE_NAME, name: "application-name" },
      { content: SITE_CREATOR, name: "author" },
      { content: SITE_CREATOR, name: "creator" },
      { content: SITE_CREATOR, name: "publisher" },
      { content: SITE_CREATOR_URL, name: "author:url" },
      { content: "health", name: "category" },
      {
        content:
          "delayed auditory feedback, DAF tool, speech practice, fluency practice, voice feedback",
        name: "keywords",
      },
      { content: "index, follow", name: "robots" },
      {
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        name: "googlebot",
      },
      { content: "website", property: "og:type" },
      { content: "en_US", property: "og:locale" },
      { content: SITE_URL, property: "og:url" },
      { content: SITE_NAME, property: "og:site_name" },
      { content: pageTitle, property: "og:title" },
      { content: SITE_DESCRIPTION, property: "og:description" },
      { content: socialImage, property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      { content: "Delayed audio feedback for pace and fluency practice", property: "og:image:alt" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: pageTitle, name: "twitter:title" },
      { content: SITE_DESCRIPTION, name: "twitter:description" },
      { content: socialImage, name: "twitter:image" },
      {
        content: "Delayed audio feedback for pace and fluency practice",
        name: "twitter:image:alt",
      },
    ],
    scripts: [
      {
        children: JSON.stringify(jsonLd),
        type: "application/ld+json",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <div className="w-full max-w-xs">
        <h1 className="font-medium text-sm">
          Delayed audio feedback{" "}
          <span className="font-normal text-muted-foreground text-xs">(use headphones)</span>
        </h1>

        <div className="mt-7">
          <AudioFeedback />
        </div>
      </div>
    </main>
  );
}
