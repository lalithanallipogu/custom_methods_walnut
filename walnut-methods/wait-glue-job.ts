import type { WalnutContext } from './walnut';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Wait For Glue Job Success
 * description: Poll AWS Glue job ${jobName} until it succeeds or fails with AWS access key ${awsAccessKeyId} secret ${awsSecretAccessKey} region ${awsRegion}
 * actionType: custom_wait_glue_job
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function waitForGlueJob(ctx: WalnutContext) {
  // ctx.args[0] = jobName (from ${jobName})
  // ctx.args[1] = AWS access key ID (from ${awsAccessKeyId})
  // ctx.args[2] = AWS secret access key (from ${awsSecretAccessKey})
  // ctx.args[3] = AWS region (from ${awsRegion})

  const jobName = ctx.args[0];
  const awsAccessKeyId = ctx.args[1];
  const awsSecretAccessKey = ctx.args[2];
  const awsRegion = ctx.args[3] || 'us-east-1';

  if (!jobName) {
    throw new Error('jobName is empty. Ensure it is set in test data.');
  }
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials missing. Ensure awsAccessKeyId and awsSecretAccessKey are set in test data.');
  }

  const maxWaitMs = 10 * 60 * 1000; // 10 minutes
  const pollIntervalMs = 30 * 1000; // 30 seconds
  const startTime = Date.now();

  ctx.log('Polling Glue job: ' + jobName);
  ctx.log('Max wait: 10 minutes, poll interval: 30 seconds');
  ctx.log('Region: ' + awsRegion);

  // Python script to get latest job run status
  const pyScript = [
    'import boto3',
    'import sys',
    'import json',
    '',
    'job_name = sys.argv[1]',
    'access_key = sys.argv[2]',
    'secret_key = sys.argv[3]',
    'region = sys.argv[4]',
    '',
    'client = boto3.client("glue",',
    '    aws_access_key_id=access_key,',
    '    aws_secret_access_key=secret_key,',
    '    region_name=region',
    ')',
    '',
    'response = client.get_job_runs(JobName=job_name, MaxResults=1)',
    'runs = response.get("JobRuns", [])',
    '',
    'if not runs:',
    '    print(json.dumps({"status": "NO_RUNS", "message": "No runs found for job"}))',
    'else:',
    '    run = runs[0]',
    '    result = {',
    '        "status": run["JobRunState"],',
    '        "runId": run["Id"],',
    '        "startedOn": str(run.get("StartedOn", "")),',
    '        "completedOn": str(run.get("CompletedOn", "")),',
    '        "errorMessage": run.get("ErrorMessage", "")',
    '    }',
    '    print(json.dumps(result))',
  ].join('\n');

  const tempDir = process.env.TEMP || '/tmp';
  const tmpScript = require('path').join(tempDir, 'glue_poll_' + Date.now() + '.py');
  const fs = require('fs');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        throw new Error('Timeout: Glue job "' + jobName + '" did not complete within 10 minutes.');
      }

      const result = spawnSync('python', [
        tmpScript,
        jobName,
        awsAccessKeyId.trim(),
        awsSecretAccessKey.trim(),
        awsRegion.trim(),
      ], {
        timeout: 30000,
        encoding: 'utf-8',
      });

      if (result.error) {
        throw new Error('Python execution error: ' + result.error.message);
      }

      if (result.status !== 0) {
        throw new Error('Failed to poll Glue job: ' + (result.stderr || result.stdout));
      }

      const output = JSON.parse(result.stdout.trim());
      const status = output.status;

      ctx.log('[' + Math.round(elapsed / 1000) + 's] Job status: ' + status);

      if (status === 'SUCCEEDED') {
        ctx.log('Glue job "' + jobName + '" completed successfully!');
        ctx.log('Run ID: ' + output.runId);
        ctx.log('Started: ' + output.startedOn);
        ctx.log('Completed: ' + output.completedOn);
        return;
      }

      if (status === 'FAILED' || status === 'ERROR' || status === 'TIMEOUT') {
        throw new Error('Glue job "' + jobName + '" failed with status: ' + status + '. Error: ' + output.errorMessage);
      }

      if (status === 'STOPPED') {
        throw new Error('Glue job "' + jobName + '" was stopped.');
      }

      if (status === 'NO_RUNS') {
        ctx.log('No runs found yet, waiting...');
      }

      // Wait 30 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
  }
}
