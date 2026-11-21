import {
  FileAddOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { App, Button, Tooltip } from "antd";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCoverLetterGeneration } from "../../requests/coverLetter";
import { getApiErrorMessage, isDailyLimitError } from "../../utils/apiError";

interface CoverLetterButtonProps {
  jobUid: string;
  hasCoverLetter: boolean;
  onOpen: () => void;
  onReady: () => void;
}

const linkStyle: CSSProperties = {
  padding: 0,
  height: "auto",
  alignSelf: "flex-start",
};

export default function CoverLetterButton({
  jobUid,
  hasCoverLetter,
  onOpen,
  onReady,
}: CoverLetterButtonProps) {
  const { message } = App.useApp();
  const [requested, setRequested] = useState(false);
  const generation = useCoverLetterGeneration(jobUid, requested);
  const announcedLimit = useRef(false);

  const status = generation.data?.status;
  // A regeneration takes the status from complete back to pending, so each run that
  // finishes is announced, but a status that was already complete on mount is not.
  const lastStatus = useRef(status);

  useEffect(() => {
    const previous = lastStatus.current;
    lastStatus.current = status;
    if (status !== "complete" || previous === "complete") return;
    message.success("Cover letter is ready");
    onReady();
  }, [status, message, onReady]);

  useEffect(() => {
    if (!generation.isError || announcedLimit.current) return;
    if (!isDailyLimitError(generation.error)) return;
    announcedLimit.current = true;
    message.warning(
      getApiErrorMessage(
        generation.error,
        "Daily demo limit reached for cover letter generation"
      )
    );
  }, [generation.isError, generation.error, message]);

  const firstRequestInFlight =
    requested && status === undefined && !generation.isError;

  if (status === "pending" || firstRequestInFlight) {
    return (
      <Tooltip title="Writing a letter from your profile, this posting, and your instructions. Usually takes a few seconds.">
        <Button type="link" size="small" loading style={linkStyle}>
          {hasCoverLetter ? "Regenerating" : "Generating"}
        </Button>
      </Tooltip>
    );
  }

  // Trust a finished generation as well as the feed: the row still holds the status
  // it was rendered with until the feed refetch lands.
  if (hasCoverLetter || status === "complete") {
    return (
      <Button
        type="link"
        size="small"
        icon={<FileTextOutlined />}
        style={linkStyle}
        onClick={onOpen}
      >
        Cover letter
      </Button>
    );
  }

  if (generation.isError) {
    const limited = isDailyLimitError(generation.error);
    const detail = getApiErrorMessage(
      generation.error,
      limited
        ? "Daily demo limit reached for cover letter generation"
        : "Could not reach the generator, or this job has no fit assessment to write from."
    );
    return (
      <Tooltip title={detail}>
        <Button
          danger
          type="link"
          size="small"
          icon={<ReloadOutlined />}
          style={linkStyle}
          onClick={() => {
            announcedLimit.current = false;
            void generation.refetch();
          }}
        >
          {limited ? "Daily limit reached" : "Generation failed — retry"}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="No letter was written for this job. Generate one now.">
      <Button
        type="link"
        size="small"
        icon={<FileAddOutlined />}
        style={linkStyle}
        onClick={() => setRequested(true)}
      >
        Generate cover letter
      </Button>
    </Tooltip>
  );
}
