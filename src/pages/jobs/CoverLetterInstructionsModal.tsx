import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Skeleton,
  Tooltip,
  Typography,
} from "antd";
import { useState } from "react";
import {
  useCoverLetterInstructions,
  useUpdateCoverLetterInstructions,
} from "../../requests/users";
import { getApiErrorMessage } from "../../utils/apiError";

interface CoverLetterInstructionsModalProps {
  open: boolean;
  onClose: () => void;
}

const EXAMPLE_INSTRUCTIONS = [
  "Keep it under 250 words",
  "Mention that I am open to relocation",
  "Use a warm, conversational tone",
];

function cleanInstructions(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

export default function CoverLetterInstructionsModal({
  open,
  onClose,
}: CoverLetterInstructionsModalProps) {
  const { message, modal } = App.useApp();
  const { instructions, isLoading, isError, error } =
    useCoverLetterInstructions(open);
  const { saveInstructions, isSaving } = useUpdateCoverLetterInstructions();

  const [draft, setDraft] = useState<string[] | null>(null);
  const [syncedInstructions, setSyncedInstructions] = useState<
    string[] | undefined
  >(undefined);

  // Seed the editable draft from server data during render (no effect needed).
  if (open && instructions !== syncedInstructions) {
    setSyncedInstructions(instructions);
    setDraft(instructions ?? null);
  }

  const dirty =
    draft !== null &&
    instructions !== undefined &&
    JSON.stringify(cleanInstructions(draft)) !== JSON.stringify(instructions);

  const doClose = () => {
    // Drop the local draft so reopening always starts from server state.
    setSyncedInstructions(undefined);
    setDraft(null);
    onClose();
  };

  const handleClose = () => {
    if (dirty) {
      modal.confirm({
        title: "Discard unsaved changes?",
        content:
          "You have edits that have not been saved. Closing now will discard them.",
        okText: "Discard",
        okButtonProps: { danger: true },
        cancelText: "Keep editing",
        onOk: doClose,
      });
      return;
    }
    doClose();
  };

  const handleSave = () => {
    if (!draft) return;
    saveInstructions(cleanInstructions(draft), {
      onSuccess: () => {
        message.success("Cover letter instructions saved");
        doClose();
      },
      onError: (saveError) =>
        message.error(
          getApiErrorMessage(saveError, "Could not save the instructions")
        ),
    });
  };

  const updateItem = (index: number, value: string) =>
    setDraft((current) =>
      current
        ? current.map((item, itemIndex) => (itemIndex === index ? value : item))
        : current
    );

  const removeItem = (index: number) =>
    setDraft((current) =>
      current ? current.filter((_, itemIndex) => itemIndex !== index) : current
    );

  const addItem = () =>
    setDraft((current) => (current ? [...current, ""] : current));

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title="Cover letter instructions"
      width={640}
      mask={{ closable: false }}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            loading={isSaving}
            disabled={!dirty}
            onClick={handleSave}
          >
            Save
          </Button>
        </Flex>
      }
    >
      <Typography.Paragraph type="secondary">
        These preferences are added to every cover letter written for you. Use
        them for tone, length, or things to emphasise or avoid. Letters that
        already exist keep their wording until you regenerate them.
      </Typography.Paragraph>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          title="Unable to load instructions"
          description={getApiErrorMessage(
            error,
            "Something went wrong while fetching your instructions."
          )}
        />
      ) : draft ? (
        <Flex vertical gap={8}>
          {draft.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No instructions yet. Letters are written in the default style."
            />
          ) : (
            draft.map((item, index) => (
              <Flex key={index} gap={8} align="flex-start">
                <Input.TextArea
                  autoFocus={index === draft.length - 1 && item === ""}
                  autoSize={{ minRows: 1, maxRows: 6 }}
                  value={item}
                  placeholder={
                    EXAMPLE_INSTRUCTIONS[index % EXAMPLE_INSTRUCTIONS.length]
                  }
                  onChange={(event) => updateItem(index, event.target.value)}
                />
                <Tooltip title="Remove instruction">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Remove instruction"
                    onClick={() => removeItem(index)}
                  />
                </Tooltip>
              </Flex>
            ))
          )}
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addItem}>
            Add instruction
          </Button>
        </Flex>
      ) : null}
    </Modal>
  );
}
