CREATE TABLE `body_measurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`measuredAt` timestamp NOT NULL DEFAULT (now()),
	`weight` decimal(5,2) NOT NULL,
	`heightCm` int,
	`chest` decimal(5,2),
	`waist` decimal(5,2),
	`hips` decimal(5,2),
	`biceps` decimal(5,2),
	`thigh` decimal(5,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `body_measurements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coach_invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`maxUses` int,
	`usesCount` int NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `coach_trainees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`traineeId` int NOT NULL,
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`linkedAt` timestamp NOT NULL DEFAULT (now()),
	`inviteCodeUsed` varchar(32),
	`coachNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coach_trainees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`username` varchar(100),
	`email` varchar(320),
	`passwordHash` varchar(255),
	`name` text,
	`role` enum('coach','trainee','admin') NOT NULL DEFAULT 'trainee',
	`phone` varchar(50),
	`avatarUrl` text,
	`heightCm` int,
	`initialWeight` decimal(5,2),
	`currentWeight` decimal(5,2),
	`targetWeight` decimal(5,2),
	`notes` text,
	`loginMethod` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workoutLogId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorRole` enum('coach','trainee') NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workoutDate` timestamp NOT NULL DEFAULT (now()),
	`title` varchar(255) NOT NULL,
	`wellness` int NOT NULL,
	`sleepHours` decimal(3,1) NOT NULL,
	`bodyWeight` decimal(5,2),
	`notes` text,
	`energyLevel` int,
	`stressLevel` int,
	`durationMinutes` int,
	`exercises` text NOT NULL,
	`totalVolume` decimal(9,2) NOT NULL DEFAULT '0',
	`totalSets` int NOT NULL DEFAULT 0,
	`totalReps` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workout_logs_id` PRIMARY KEY(`id`)
);
