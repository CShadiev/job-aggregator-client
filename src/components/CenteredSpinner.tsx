import { Flex, Spin } from "antd";

export default function CenteredSpinner() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "60vh" }}>
      <Spin size="large" />
    </Flex>
  );
}
