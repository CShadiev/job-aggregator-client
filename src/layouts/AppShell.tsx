import { LogoutOutlined } from "@ant-design/icons";
import { Alert, Button, Flex, Layout, Tag, Typography, theme } from "antd";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const { Header, Content } = Layout;

export default function AppShell() {
  const { token } = theme.useToken();
  const { logout, isDemo } = useAuth();

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgBase }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: token.colorPrimary,
          paddingInline: 24,
        }}
      >
        <Flex align="center" gap={12}>
          <Typography.Title
            level={4}
            style={{ margin: 0, color: token.colorWhite }}
          >
            Job Aggregator
          </Typography.Title>
          {isDemo ? (
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              Demo
            </Tag>
          ) : null}
        </Flex>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => void logout()}
          style={{ color: token.colorWhite }}
        >
          Log out
        </Button>
      </Header>
      <Content style={{ padding: 24 }}>
        <Flex vertical gap={24} style={{ maxWidth: 1400, margin: "0 auto" }}>
          {isDemo ? (
            <Alert
              type="info"
              showIcon
              title="Demo session — shared sample candidate"
              description="Changes you make (status, cover letters) are visible to other visitors. Manual job submits and cover-letter generations are limited to 10 each per UTC day. Pasted job URLs must be https links to LinkedIn, Arbeitnow, or Indeed."
            />
          ) : null}
          <Outlet />
        </Flex>
      </Content>
    </Layout>
  );
}
