-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "defaultFooterImage" TEXT,
ADD COLUMN     "defaultHeaderImage" TEXT;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "bodyImages" JSONB,
ADD COLUMN     "footerImageUrl" TEXT,
ADD COLUMN     "headerImageUrl" TEXT;
