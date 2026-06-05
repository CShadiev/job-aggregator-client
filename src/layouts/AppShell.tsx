import { LogoutOutlined } from "@ant-design/icons";
import { Button, Flex, Layout, Typography, theme } from "antd";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const { Header, Content } = Layout;

export default function AppShell() {
  const { token } = theme.useToken();
  const { logout } = useAuth();

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
        <Typography.Title
          level={4}
          style={{ margin: 0, color: token.colorWhite }}
        >
          Job Aggregator
        </Typography.Title>
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
          <Outlet />
        </Flex>
      </Content>
    </Layout>
  );
}
