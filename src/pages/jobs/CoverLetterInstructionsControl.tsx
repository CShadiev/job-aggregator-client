import { FormOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useState } from "react";
import CoverLetterInstructionsModal from "./CoverLetterInstructionsModal";

export default function CoverLetterInstructionsControl() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button icon={<FormOutlined />} onClick={() => setOpen(true)}>
        Letter instructions
      </Button>
      <CoverLetterInstructionsModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
