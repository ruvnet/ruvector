# Genomic Vector Analysis - Bioinformatics Tools Integration
# Complete environment with VEP, ANNOVAR, samtools, bcftools, GATK, and more

FROM ubuntu:22.04

LABEL maintainer="ruvector"
LABEL description="Complete bioinformatics environment with genomic vector analysis"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Build essentials
    build-essential \
    cmake \
    git \
    wget \
    curl \
    unzip \
    gzip \
    bzip2 \
    # Perl and Python
    perl \
    perl-base \
    perl-modules \
    python3 \
    python3-pip \
    python3-dev \
    # Node.js
    nodejs \
    npm \
    # Libraries
    libssl-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libz-dev \
    libbz2-dev \
    liblzma-dev \
    libncurses5-dev \
    # Java for GATK
    openjdk-11-jdk \
    # Database
    sqlite3 \
    libsqlite3-dev \
    # Tools
    tabix \
    bcftools \
    bedtools \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/bioinformatics

# Install samtools
RUN wget https://github.com/samtools/samtools/releases/download/1.18/samtools-1.18.tar.bz2 && \
    tar -xjf samtools-1.18.tar.bz2 && \
    cd samtools-1.18 && \
    ./configure --prefix=/usr/local && \
    make && \
    make install && \
    cd .. && \
    rm -rf samtools-1.18*

# Install htslib
RUN wget https://github.com/samtools/htslib/releases/download/1.18/htslib-1.18.tar.bz2 && \
    tar -xjf htslib-1.18.tar.bz2 && \
    cd htslib-1.18 && \
    ./configure --prefix=/usr/local && \
    make && \
    make install && \
    cd .. && \
    rm -rf htslib-1.18*

# Install GATK
RUN wget https://github.com/broadinstitute/gatk/releases/download/4.4.0.0/gatk-4.4.0.0.zip && \
    unzip gatk-4.4.0.0.zip && \
    mv gatk-4.4.0.0 /opt/gatk && \
    rm gatk-4.4.0.0.zip && \
    ln -s /opt/gatk/gatk /usr/local/bin/gatk

# Install VEP (Ensembl Variant Effect Predictor)
RUN git clone https://github.com/Ensembl/ensembl-vep.git && \
    cd ensembl-vep && \
    perl INSTALL.pl --AUTO a --NO_TEST --NO_UPDATE && \
    cd ..

ENV PATH="/opt/bioinformatics/ensembl-vep:${PATH}"

# Install VEP cache (GRCh38) - partial download for demo
# Full cache should be downloaded separately: ~20GB
RUN mkdir -p /opt/vep-cache && \
    cd /opt/vep-cache && \
    wget https://ftp.ensembl.org/pub/current_variation/indexed_vep_cache/homo_sapiens_vep_110_GRCh38.tar.gz && \
    tar -xzf homo_sapiens_vep_110_GRCh38.tar.gz && \
    rm homo_sapiens_vep_110_GRCh38.tar.gz

# Install ANNOVAR (placeholder - requires registration and license)
# Users need to download ANNOVAR separately from: https://annovar.openbioinformatics.org
RUN mkdir -p /opt/annovar && \
    echo "Please download ANNOVAR from https://annovar.openbioinformatics.org" > /opt/annovar/README.txt

# Install CPAN modules for ANNOVAR
RUN cpan -i DBI DBD::SQLite

# Install Python packages
RUN pip3 install --upgrade pip && \
    pip3 install \
    pysam \
    biopython \
    pandas \
    numpy \
    scipy \
    scikit-learn \
    matplotlib \
    seaborn \
    jupyter \
    notebook

# Install Node.js packages globally
RUN npm install -g \
    typescript \
    ts-node \
    @types/node

# Create directories for databases
RUN mkdir -p /data/reference \
             /data/databases \
             /data/input \
             /data/output \
             /data/cache

# Download and prepare reference genome (GRCh38) - chromosome 22 for demo
RUN cd /data/reference && \
    wget http://hgdownload.soe.ucsc.edu/goldenPath/hg38/chromosomes/chr22.fa.gz && \
    gunzip chr22.fa.gz && \
    samtools faidx chr22.fa

# Download ClinVar VCF (latest)
RUN cd /data/databases && \
    wget https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz && \
    wget https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz.tbi

# Download gnomAD subset (chromosome 22 for demo)
RUN cd /data/databases && \
    wget https://storage.googleapis.com/gcp-public-data--gnomad/release/4.0/vcf/genomes/gnomad.genomes.v4.0.sites.chr22.vcf.bgz && \
    wget https://storage.googleapis.com/gcp-public-data--gnomad/release/4.0/vcf/genomes/gnomad.genomes.v4.0.sites.chr22.vcf.bgz.tbi

# Download HPO ontology
RUN cd /data/databases && \
    wget http://purl.obolibrary.org/obo/hp.obo && \
    wget http://purl.obolibrary.org/obo/hp/hpoa/phenotype_to_genes.txt

# Install genomic-vector-analysis package
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Set environment variables
ENV ANNOVAR_PATH=/opt/annovar
ENV VEP_PATH=/opt/bioinformatics/ensembl-vep
ENV VEP_CACHE=/opt/vep-cache
ENV REFERENCE_GENOME=/data/reference/chr22.fa
ENV CLINVAR_VCF=/data/databases/clinvar.vcf.gz
ENV GNOMAD_VCF=/data/databases/gnomad.genomes.v4.0.sites.chr22.vcf.bgz
ENV HPO_OBO=/data/databases/hp.obo
ENV HPO_GENES=/data/databases/phenotype_to_genes.txt

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Genomic Vector Analysis - Bioinformatics Environment"\n\
echo "===================================================="\n\
echo ""\n\
echo "Available tools:"\n\
echo "  - samtools $(samtools --version | head -n1)"\n\
echo "  - bcftools $(bcftools --version | head -n1)"\n\
echo "  - GATK $(gatk --version)"\n\
echo "  - VEP $(vep --help | grep "Versions:" | head -n1)"\n\
echo "  - bedtools $(bedtools --version)"\n\
echo ""\n\
echo "Environment variables:"\n\
echo "  ANNOVAR_PATH: $ANNOVAR_PATH"\n\
echo "  VEP_PATH: $VEP_PATH"\n\
echo "  REFERENCE_GENOME: $REFERENCE_GENOME"\n\
echo "  CLINVAR_VCF: $CLINVAR_VCF"\n\
echo "  GNOMAD_VCF: $GNOMAD_VCF"\n\
echo ""\n\
echo "Directories:"\n\
echo "  /data/input - Place your input files here"\n\
echo "  /data/output - Output files will be written here"\n\
echo "  /data/databases - Reference databases"\n\
echo ""\n\
exec "$@"\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

# Expose ports for Jupyter notebook
EXPOSE 8888

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Default command
CMD ["/bin/bash"]
