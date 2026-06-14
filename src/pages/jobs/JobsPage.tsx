import { Alert, Badge, Flex, Segmented, Typography } from "antd";
import { useMemo, useState } from "react";
import {
  APPLIED_JOBS_QUERY,
  DEFAULT_APPLIED_POSTED_WITHIN_DAYS,
  DEFAULT_JOB_FEED_QUERY,
  type JobFeedQuery,
  type JobFeedScope,
} from "../../types/jobs";
import { useAppliedJobFeed, useUnappliedJobFeed } from "../../requests/jobs";
import AppliedJobsControls from "./AppliedJobsControls";
import JobFilters from "./JobFilters";
import JobList from "./JobList";

export default function JobsPage() {
  const [activePanel, setActivePanel] = useState<JobFeedScope>("unapplied");
  const [query, setQuery] = useState<JobFeedQuery>(DEFAULT_JOB_FEED_QUERY);
  const [unappliedPage, setUnappliedPage] = useState(1);
  const [unappliedPageSize, setUnappliedPageSize] = useState(10);
  const [appliedPage, setAppliedPage] = useState(1);
  const [appliedPageSize, setAppliedPageSize] = useState(10);
  const [appliedPostedWithinDays, setAppliedPostedWithinDays] = useState(
    DEFAULT_APPLIED_POSTED_WITHIN_DAYS
  );

  const unappliedContext = useMemo(
    () => ({
      query,
      page: unappliedPage,
      pageSize: unappliedPageSize,
      scope: "unapplied" as const,
    }),
    [query, unappliedPage, unappliedPageSize]
  );

  const appliedContext = useMemo(
    () => ({
      query: APPLIED_JOBS_QUERY,
      page: appliedPage,
      pageSize: appliedPageSize,
      scope: "applied" as const,
      postedWithinDays: appliedPostedWithinDays,
    }),
    [appliedPage, appliedPageSize, appliedPostedWithinDays]
  );

  const unappliedFeed = useUnappliedJobFeed(unappliedContext);
  const appliedFeed = useAppliedJobFeed(
    appliedPostedWithinDays,
    appliedPage,
    appliedPageSize
  );

  const handleApplyFilters = (nextQuery: JobFeedQuery) => {
    setQuery(nextQuery);
    setUnappliedPage(1);
  };

  const handleResetFilters = () => {
    setQuery(DEFAULT_JOB_FEED_QUERY);
    setUnappliedPage(1);
  };

  const handleAppliedWindowChange = (days: number) => {
    setAppliedPostedWithinDays(days);
    setAppliedPage(1);
  };

  console.log("unappliedFeed.jobs", unappliedFeed.jobs);

  return (
    <Flex vertical gap={24}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          Job feed
        </Typography.Title>
        <Typography.Text type="secondary">
          Browse new opportunities with discovery filters, or review jobs you
          have already applied to.
        </Typography.Text>
      </div>

      <Segmented
        value={activePanel}
        onChange={(value) => setActivePanel(value as JobFeedScope)}
        options={[
          { label: "New opportunities", value: "unapplied" },
          {
            label: (
              <Flex align="center" gap={8}>
                My applications
                <Badge
                  count={appliedFeed.total}
                  overflowCount={999}
                  showZero
                  color="blue"
                />
              </Flex>
            ),
            value: "applied",
          },
        ]}
      />

      {activePanel === "unapplied" ? (
        <>
          <JobFilters
            query={query}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            loading={unappliedFeed.isFetching}
          />

          {unappliedFeed.isError ? (
            <Alert
              type="error"
              showIcon
              title="Unable to load jobs"
              description={
                unappliedFeed.error instanceof Error
                  ? unappliedFeed.error.message
                  : "Something went wrong while fetching the job feed."
              }
            />
          ) : null}

          <JobList
            listKey="unapplied"
            jobs={unappliedFeed.jobs}
            total={unappliedFeed.total}
            page={unappliedFeed.page}
            pageSize={unappliedFeed.pageSize}
            loading={unappliedFeed.isLoading || unappliedFeed.isFetching}
            filterContext={unappliedContext}
            onPageChange={(nextPage, nextPageSize) => {
              setUnappliedPage(nextPage);
              setUnappliedPageSize(nextPageSize);
            }}
            emptyTitle="No new opportunities match your filters"
            emptyDescription="Try adjusting the discovery filters or clearing some constraints."
            allowSkip
          />
        </>
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            message="Discovery filters do not apply here"
            description="This list shows jobs you have already applied to, sorted by posted date. Use the New opportunities tab to filter and discover roles."
          />

          <AppliedJobsControls
            postedWithinDays={appliedPostedWithinDays}
            onPostedWithinDaysChange={handleAppliedWindowChange}
            count={appliedFeed.total}
            loading={appliedFeed.isLoading || appliedFeed.isFetching}
          />

          {appliedFeed.isError ? (
            <Alert
              type="error"
              showIcon
              message="Unable to load applications"
              description={
                appliedFeed.error instanceof Error
                  ? appliedFeed.error.message
                  : "Something went wrong while fetching your applications."
              }
            />
          ) : null}

          <JobList
            listKey="applied"
            jobs={appliedFeed.jobs}
            total={appliedFeed.total}
            page={appliedFeed.page}
            pageSize={appliedFeed.pageSize}
            loading={appliedFeed.isLoading || appliedFeed.isFetching}
            filterContext={appliedContext}
            onPageChange={(nextPage, nextPageSize) => {
              setAppliedPage(nextPage);
              setAppliedPageSize(nextPageSize);
            }}
            emptyTitle="No applications in this period"
            emptyDescription="Try widening the posted date window, or mark a job as applied from the New opportunities tab."
          />
        </>
      )}
    </Flex>
  );
}
