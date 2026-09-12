import {
  FileAddOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Tooltip } from "antd";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCoverLetterGeneration } from "../../requests/coverLetter";

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
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState(false);
  const generation = useCoverLetterGeneration(requested ? jobUid : null);
  const announced = useRef(false);

  const status = generation.data?.status;

  useEffect(() => {
    if (status !== "complete" || announced.current) return;
    announced.current = true;
    message.success("Cover letter is ready");
    // The feed carries cover_letter_key, so it has to be refetched before this row
    // stops offering to generate a letter that now exists.
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    onReady();
  }, [status, message, queryClient, onReady]);

  // Trust a finished generation as well as the feed: the row still holds the status
  // it was rendered with until the refetch above lands.
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
    return (
      <Tooltip title="Could not reach the generator, or this job has no fit assessment to write from.">
        <Button
          danger
          type="link"
          size="small"
          icon={<ReloadOutlined />}
          style={linkStyle}
          onClick={() => generation.refetch()}
        >
          Generation failed — retry
        </Button>
      </Tooltip>
    );
  }

  if (requested) {
    return (
      <Tooltip title="Writing a letter from your profile and this posting. Usually takes a few seconds.">
        <Button type="link" size="small" loading style={linkStyle}>
          Generating
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
