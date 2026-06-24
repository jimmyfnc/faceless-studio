import "./index.css";
import { Composition } from "remotion";
import {
  ExplainerVideo,
  explainerSchema,
  calculateExplainerMetadata,
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
    </>
  );
};
