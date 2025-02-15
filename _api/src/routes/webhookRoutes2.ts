import {
  type OrganizationJSON,
  type OrganizationMembershipJSON,
  type UserJSON,
} from '@clerk/express';
import { type Request, type Response, Router } from 'express';
import { type IncomingHttpHeaders } from 'http';
import { Webhook } from 'svix';

import { addOrganization } from '../models/OrganizationRepo';
import { addOrganizationUser } from '../models/OrganizationUserRepo';
import { addUser } from '../models/userRepo';

const router = Router();

// Webhook request type
// type WebhookRequest = Request & { rawBody?: Buffer };

// Clerk webhook event types
// type UserData = {
//   id: string;
//   email_addresses: {
//     email_address_id: string;
//     to_email_address: string;
//   }[];
//   user_id: string;
//   data;
// };

type WebhookEvent = {
  data: any;
  object: string;
  type: string;
};

router.get('/', (_req: Request, res: Response) => {
  console.log('I Got the thing', _req.body);
  res.json({ status: 'OK' });
});

router.post('/', async (req, res: Response) => {
  const body = req.body as WebhookEvent;
  console.log('Webhook received TYPED:', body);
  try {
    console.log('got webook 2');

    console.log('Verifying headers ...');
    verifyHeaders(req.headers, body);

    console.log('doing the switch statement');
    await handleWebhookEvent(body);

    console.log('step 5 return success');

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Error processing webhook' });
  }
});

const verifyHeaders = (headers: IncomingHttpHeaders, body: WebhookEvent) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }
  // Get the headers
  const svix_id = headers['svix-id'] as string;
  const svix_timestamp = headers['svix-timestamp'] as string;
  const svix_signature = headers['svix-signature'] as string;

  console.log('Found headers');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error('Missing webhook headers');
  }

  // Create a new Svix instance with your secret
  console.log('Creating webhook verification object');
  const wh = new Webhook(WEBHOOK_SECRET);
  try {
    console.log('Verifying webhook signature');
    wh.verify(JSON.stringify(body) || '{}', {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    throw new Error('Invalid webhook signature');
  }
};

const handleWebhookEvent = async (event: WebhookEvent) => {
  // Handle different webhook events
  /**
   * session.created - when user logs in
   *
   */

  switch (event.type) {
    case 'user.created': {
      console.log('User updated:', event.data);
      const rawUserData = event.data as UserJSON;
      const emailAddress = rawUserData.email_addresses[0].email_address;
      console.log('Email Address:', emailAddress);

      await addUser(rawUserData.id, emailAddress, {
        firstName: rawUserData.first_name,
        lastName: rawUserData.last_name,
      });
      break;
    }

    case 'user.deleted': {
      console.log('User deleted:', event.data.id);
      // const primaryEmail = body.data.email_addresses.find(
      //   (email) => email.id === body.data.primary_email_address_id
      // )?.email_address;

      // if (primaryEmail) {
      //   await prisma.user.delete({
      //     where: { email: primaryEmail },
      //   });
      // }
      break;
    }

    case 'organizationMembership.created': {
      const rawData = event.data as OrganizationMembershipJSON;

      rawData.id;
      await addOrganizationUser(
        rawData.id,
        rawData.public_user_data.user_id,
        rawData.organization.id,
        rawData.role
      );
      break;
    }

    case 'organization.created': {
      console.log('Organization created:', event.data);
      const rawOrgData = event.data as OrganizationJSON;
      await addOrganization(rawOrgData.id, rawOrgData.name);
      break;
    }
  }
};

export default router;
