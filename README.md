# Job Aggregator Client

This is the client application for the Job Aggregator project.

## Models

```python
class JobPosting(BaseModel):
    """Canonical representation of a collected job posting.

    This model is the common output type of every collector and parser in the
    collection service.  All timestamps are coerced to UTC.
    """

    uid: str
    """Globally unique identifier for the posting, e.g. ``"stepstone:abc123"``."""

    source: str
    """Short label for the origin data source, e.g. ``"arbeitnow"``."""

    title: str
    """Job title as published by the source."""

    company: str
    """Hiring company name as published by the source."""

    location: str
    """Location string as published by the source (may be empty)."""

    remote: bool
    """Whether the position is advertised as remote-friendly."""

    url: str
    """Canonical URL of the original job posting."""

    tags: list[str] = Field(default_factory=list)
    """Normalised (lower-cased) skill/technology tags attached to the posting."""

    description_raw: str
    """Full job description, typically in HTML or plain text."""

    job_types: list[str] = Field(default_factory=list)
    """Normalised (lower-cased) employment types, e.g. ``["full-time"]``."""

    posted_at: ts
    """Timestamp when the job was published by the source, normalised to UTC."""

    collected_at: ts
    """Timestamp when the job was fetched by the collector, normalised to UTC."""

    updated_at: ts = Field(default_factory=lambda: datetime.now(timezone.utc))
    """Timestamp of the last update to this record, normalised to UTC."""

    company_normalized: Optional[str] = None
    """Canonical company name after entity resolution (populated downstream)."""

    title_normalized: Optional[str] = None
    """Canonical job title after normalisation (populated downstream)."""

class FitAssessment(BaseModel):
    """Structured fit assessment for a candidate against a job posting."""

    cv_ats_match_score: float = Field(ge=0, le=100)
    """ATS-style match score using only the CV and job description.

    Estimates the likelihood of passing automated or recruiter initial screening
    when the CV is submitted as-is.
    """

    profile_ats_match_score: float = Field(ge=0, le=100)
    """ATS-style match score using the full user profile and job description.

    Reflects the candidate's true fit against role requirements, including
    information that may not appear on the CV.
    """

    deal_breakers: list[str] = Field(default_factory=list)
    """Hard requirements from the job that the candidate does not meet.

    Examples: missing language, required technology absent from profile/CV,
    insufficient years of experience, work-authorization mismatch.
    """

    summary: str
    """Short narrative summary of the overall fit assessment."""


class ApplicationStage(StrEnum):
    """Pipeline stage for an individual job application."""

    APPLIED = "applied"
    HIRING_MANAGER_INTERVIEW = "hiring_manager_interview"
    TECHNICAL_INTERVIEW = "technical_interview"
    RECEIVED_OFFER = "received_offer"


class JobApplicationStatus(BaseModel):
    """Status of a user's application to a specific job posting."""

    username: str
    job_uid: str
    active: bool = Field(
        description="Whether the application is still being pursued (False when withdrawn or closed).",
        default=True,
    )
    stage: ApplicationStage = Field(
        description="The current stage of the application process.",
        default=ApplicationStage.APPLIED,
    )


class JobFeedItem(BaseModel):
    job: JobPosting
    fit: FitAssessment
    status: JobApplicationStatus | None = None

class UpdateJobStatusRequest(BaseModel):
    """Partial update payload for a user's application status on a job."""

    active: Optional[bool] = None
    stage: Optional[ApplicationStage] = None


class JobFeedSortField(StrEnum):
    POSTED_AT = "posted_at"
    CV_ATS_MATCH_SCORE = "cv_ats_match_score"
    PROFILE_ATS_MATCH_SCORE = "profile_ats_match_score"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


class JobFeedQuery(BaseModel):
    """Filter and sort parameters for the paginated job feed."""

    remote: Optional[bool] = None
    sources: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    location: Optional[str] = None
    min_cv_ats_match_score: Optional[float] = Field(default=None, ge=0, le=100)
    min_profile_ats_match_score: Optional[float] = Field(default=None, ge=0, le=100)
    exclude_deal_breakers: bool = False
    application_stage: Optional[ApplicationStage] = None
    active_only: bool = False
    sort_by: JobFeedSortField = JobFeedSortField.PROFILE_ATS_MATCH_SCORE
    sort_order: SortOrder = SortOrder.DESC


class PaginatedDataResponse(BaseModel, Generic[T]):
    data: list[T]

    page: int
    page_size: int
    total: int


class PaginatedDataRequest(BaseModel, Generic[T]):
    query: T
    page: int = 1
    page_size: int = 10


class LoginResponse(BaseModel):
    '''
    Response model for successful login.
    '''
    access_token: str
    id_token: str
    token_type: str
    expires_in: int
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    '''
    Request model for user logout.
    '''
    refresh_token: str | None = None


class RefreshTokenRequest(BaseModel):
    '''
    Request model for refreshing a token.
    '''
    refresh_token: str

class LoginRequest(BaseModel):
    '''
    Request model for user login.
    '''
    username: str
    password: str

```

## Endpoints

- POST: /jobs/search
  body: PaginatedDataRequest[JobFeedQuery]

- PATCH: /jobs/{job_uid}/status
  job_uid: str
  body: UpdateJobStatusRequest

- POST: /users/login
  body: LoginRequest

- POST: /users/refresh
  body: RefreshTokenRequest
