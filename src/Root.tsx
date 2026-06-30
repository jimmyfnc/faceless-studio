import "./index.css";
import { Composition } from "remotion";
import {
  ExplainerVideo,
  explainerSchema,
  calculateExplainerMetadata,
  calculateShortMetadata,
  FPS,
} from "./compositions/ExplainerVideo";
import { sampleExplainer } from "./data/sample-explainer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo}
        schema={explainerSchema}
        defaultProps={sampleExplainer}
        calculateMetadata={calculateExplainerMetadata}
        // Fallbacks; duration is overridden by calculateMetadata.
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Vertical short cut (Shorts/Reels/TikTok). The `short` tool feeds it a
          trimmed leading window of a video's props. */}
      <Composition
        id="ExplainerShort"
        component={ExplainerVideo}
        schema={explainerSchema}
        defaultProps={sampleExplainer}
        calculateMetadata={calculateShortMetadata}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
