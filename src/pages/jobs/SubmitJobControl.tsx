import { PlusOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useManualJobSubmitPoll,
  useSubmitManualJob,
} from "../../requests/jobs";
import type { ManualJobSubmitRequest } from "../../types/jobs";
import { getApiErrorMessage } from "../../utils/apiError";
import SubmitJobModal from "./SubmitJobModal";

function SubmitJobPoller({
  request,
  onComplete,
}: {
  request: ManualJobSubmitRequest;
  onComplete: (jobUid: string) => void;
}) {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const { status } = useManualJobSubmitPoll(request);
  const announced = useRef(false);

  useEffect(() => {
    if (status !== "complete" || announced.current) return;
    announced.current = true;
    notification.success({
      key: request.job_uid,
      title: "Job is ready",
      description: `${request.title} at ${request.company} is now in your feed, with a cover letter.`,
    });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    onComplete(request.job_uid);
  }, [
    status,
    notification,
    queryClient,
    onComplete,
    request.job_uid,
    request.title,
    request.company,
  ]);

  return null;
}

export default function SubmitJobControl() {
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const { submitJob, isSubmitting } = useSubmitManualJob();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ManualJobSubmitRequest[]>([]);

  const handlePollComplete = useCallback((jobUid: string) => {
    setPending((current) => current.filter((item) => item.job_uid !== jobUid));
  }, []);

  const handleSubmit = (fields: Omit<ManualJobSubmitRequest, "job_uid">) => {
    const request: ManualJobSubmitRequest = {
      ...fields,
      job_uid: crypto.randomUUID(),
    };

    submitJob(request, {
      onSuccess: (response) => {
        setOpen(false);
        if (response.status === "complete") {
          notification.success({
            key: request.job_uid,
            title: "Job is ready",
            description: `${request.title} at ${request.company} is now in your feed, with a cover letter.`,
          });
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
          return;
        }

        notification.info({
          key: request.job_uid,
          title: "Job submitted",
          description: `Evaluating ${request.title} at ${request.company}. You will be notified when it is ready.`,
          duration: false,
        });
        setPending((current) => [...current, request]);
      },
      onError: (error) => {
        notification.error({
          title: "Could not submit job",
          description: getApiErrorMessage(
            error,
            "The API did not accept this job description."
          ),
        });
      },
    });
  };

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
      >
        Submit a job
      </Button>
      <SubmitJobModal
        open={open}
        submitting={isSubmitting}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
      {pending.map((request) => (
        <SubmitJobPoller
          key={request.job_uid}
          request={request}
          onComplete={handlePollComplete}
        />
      ))}
    </>
  );
}
