import { useEffect, useRef, useState } from "react";
import { ArrowRight, Pause, Play, ShieldCheck, X } from "lucide-react";

import { APP_PATH } from "../authRoutes.js";
import { PRODUCT_TOUR_VERSION } from "./productTourConfig.js";
import { trackProductTourEvent } from "./productTourAnalytics.js";

const LOOP_POSTER = "/product-tour/gigscapes-product-tour-poster.png";
const LOOP_MP4 = "/product-tour/gigscapes-product-tour-loop.mp4";
const LOOP_WEBM = "/product-tour/gigscapes-product-tour-loop.webm";
const GUIDE_MP4 = "/product-tour/gigscapes-how-it-works.mp4";
const GUIDE_WEBM = "/product-tour/gigscapes-how-it-works.webm";

export const PRODUCT_TOUR_TRANSCRIPT = Object.freeze([
  ["Paste the complete posting", "Bring the full job description into Gigscapes. Link and screenshot intake are also available in the app."],
  ["Review the extracted job", "Confirm the title, employer, responsibilities, qualifications, and high-signal keywords before tailoring."],
  ["Tailor from evidence", "Gigscapes compares the reviewed posting with confirmed candidate history. Employer requirements never become candidate evidence."],
  ["See the Evidence Map", "Direct, adjacent, transferable, and missing evidence remain separate so the user can understand the fit."],
  ["Assess application risk", "A truthful résumé can still have a material gap. Unsupported PLC programming remains visible instead of being added as a skill."],
  ["Choose the presentation", "Content strategy controls evidence emphasis and section order. Visual design changes appearance without changing facts or readiness."],
  ["Review and export", "The user reviews the final résumé and downloads an editable DOCX or selectable PDF. Gigscapes never submits an application automatically."],
]);

function readPlaybackPreferences() {
  if (typeof window === "undefined") return { reducedMotion: true, saveData: false };
  return {
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    saveData: window.navigator?.connection?.saveData === true,
  };
}

function VideoSources({ guide = false }) {
  return (
    <>
      <source src={guide ? GUIDE_MP4 : LOOP_MP4} type="video/mp4" />
      <source src={guide ? GUIDE_WEBM : LOOP_WEBM} type="video/webm" />
    </>
  );
}

export function ProductTour() {
  const heroVideoRef = useRef(null);
  const guideVideoRef = useRef(null);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const [preferences, setPreferences] = useState(readPlaybackPreferences);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const impressionSent = useRef(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setPreferences(readPlaybackPreferences());
    query?.addEventListener?.("change", update);
    return () => query?.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || impressionSent.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35);
      if (visible && !impressionSent.current) {
        impressionSent.current = true;
        trackProductTourEvent("impression", "landing_loop");
      }
      if (!visible && !video.paused) video.pause();
    }, { threshold: [0.35] });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dialogOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [dialogOpen]);

  const autoplayAllowed = !preferences.reducedMotion && !preferences.saveData && !videoError;

  const toggleHeroPlayback = async () => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended || video.currentTime >= video.duration - 0.1) {
        video.currentTime = 0;
        trackProductTourEvent("replay", "landing_loop");
      }
      try { await video.play(); } catch { setVideoError(true); }
    } else {
      video.pause();
    }
  };

  const openGuide = () => {
    openerRef.current = document.activeElement;
    setDialogOpen(true);
    dialogRef.current?.showModal();
    trackProductTourEvent("cta_clicked", "landing_loop");
  };

  const closeGuide = () => {
    guideVideoRef.current?.pause();
    dialogRef.current?.close();
    setDialogOpen(false);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };

  return (
    <>
      <section className="landing-product-demo landing-product-tour" role="region" aria-labelledby="product-tour-title" data-product-tour-version={PRODUCT_TOUR_VERSION}>
        <div className="landing-product-tour-toolbar">
          <span><i /><i /><i /></span>
          <strong id="product-tour-title">How Gigscapes works</strong>
          <button type="button" onClick={toggleHeroPlayback} aria-label={isPlaying ? "Pause product tour" : "Play product tour"} disabled={videoError}>
            {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
        </div>
        {videoError ? (
          <div className="landing-product-tour-fallback">
            <img src={LOOP_POSTER} alt="Gigscapes product walkthrough preview" />
            <p>The video could not be loaded. The complete text walkthrough is still available.</p>
          </div>
        ) : (
          <video
            ref={heroVideoRef}
            className="landing-product-tour-video"
            poster={LOOP_POSTER}
            autoPlay={autoplayAllowed}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Product walkthrough showing how a job posting is reviewed, matched to verified résumé evidence, and exported as a DOCX or selectable PDF"
            onPlay={() => {
              setIsPlaying(true);
              trackProductTourEvent(heroVideoRef.current?.currentTime < 0.25 ? "autoplay_started" : "play", "landing_loop");
            }}
            onPause={() => { setIsPlaying(false); trackProductTourEvent("pause", "landing_loop"); }}
            onEnded={() => trackProductTourEvent("complete", "landing_loop")}
            onError={() => { setVideoError(true); trackProductTourEvent("error", "landing_loop"); }}
          >
            <VideoSources />
            Your browser does not support embedded video.
          </video>
        )}
        <div className="landing-product-tour-actions">
          <div><ShieldCheck aria-hidden="true" /><span><strong>Real workflow.</strong> Synthetic candidate. No personal data.</span></div>
          <button ref={openerRef} type="button" className="landing-button landing-button--secondary" onClick={openGuide}>
            <Play aria-hidden="true" /> Watch the complete guide
          </button>
        </div>
      </section>

      <dialog
        ref={dialogRef}
        className="landing-product-tour-dialog"
        aria-labelledby="product-tour-dialog-title"
        onClose={handleDialogClose}
        onCancel={(event) => { event.preventDefault(); closeGuide(); }}
        onClick={(event) => { if (event.target === dialogRef.current) closeGuide(); }}
      >
        <div className="landing-product-tour-dialog-card">
          <header>
            <div><span>About 1 minute</span><h2 id="product-tour-dialog-title">How Gigscapes works</h2></div>
            <button type="button" onClick={closeGuide} aria-label="Close product tour"><X aria-hidden="true" /></button>
          </header>
          <video
            ref={guideVideoRef}
            controls
            playsInline
            preload="none"
            poster={LOOP_POSTER}
            aria-label="Complete Gigscapes evidence-first résumé tailoring walkthrough"
            onPlay={() => trackProductTourEvent("play", "full_guide")}
            onPause={() => trackProductTourEvent("pause", "full_guide")}
            onEnded={() => trackProductTourEvent("complete", "full_guide")}
            onError={() => trackProductTourEvent("error", "full_guide")}
          >
            <VideoSources guide />
            Your browser does not support embedded video. Read the transcript below.
          </video>
          <details onToggle={(event) => { if (event.currentTarget.open) trackProductTourEvent("transcript_opened", "full_guide"); }}>
            <summary>Read the video transcript</summary>
            <ol>{PRODUCT_TOUR_TRANSCRIPT.map(([title, copy]) => <li key={title}><strong>{title}</strong><p>{copy}</p></li>)}</ol>
          </details>
          <footer>
            <p>Gigscapes never invents qualifications or submits applications automatically.</p>
            <a className="landing-button landing-button--primary" href={APP_PATH} onClick={() => trackProductTourEvent("cta_clicked", "full_guide")}>Open Gigscapes <ArrowRight aria-hidden="true" /></a>
          </footer>
        </div>
      </dialog>
    </>
  );
}
