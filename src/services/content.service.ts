import { CreateContentRequestDto, IDDto, UpdateContentRequestDto } from '../dto';
import { ContentRevisionModel } from '../models';
import { Repository } from 'typeorm';
import {
    ContentModelsToContentResponseDtosConverter,
    ContentModelToContentResponseDtoConverter,
    CreateContentRequestDtoToContentModelConverter,
    CreateContentRequestDtoToContentRevisionModelConverter
} from '../converters';
import { inject, singleton } from 'tsyringe';
import { ExtendedContentRepository } from '../repositories';

@singleton()
export class ContentService {
    constructor(private contentModelToContentResponseDtoConverter: ContentModelToContentResponseDtoConverter,
                private contentModelsToContentResponseDtosConverter: ContentModelsToContentResponseDtosConverter,
                private createContentRequestDtoToContentModelConverter:
                    CreateContentRequestDtoToContentModelConverter,
                private createContentRequestDtoToContentRevisionModelConverter:
                    CreateContentRequestDtoToContentRevisionModelConverter,
                @inject('ContentRepository') private contentRepository: ExtendedContentRepository,
                @inject('ContentRevisionRepository') private contentRevisionRepository: Repository<ContentRevisionModel>) {
    }

    async list() {
        const results = await this.contentRepository.findAndCountWithOptions();
        return [this.contentModelsToContentResponseDtosConverter.convert(results[0]), results[1]];
    }

    async read(idDto: IDDto) {
        const result = await this.contentRepository.findOneByIdWithOptions(idDto.id);
        if (result) {
            return this.contentModelToContentResponseDtoConverter.convert(result);
        }
        return null;
    }

    async create(ccDto: CreateContentRequestDto) {
        const contentModel = this.createContentRequestDtoToContentModelConverter.convert(ccDto);
        const contentRevisionModel = this.createContentRequestDtoToContentRevisionModelConverter.convert(ccDto);
        contentModel.contentRevisions = [contentRevisionModel];
        await this.contentRepository.save(contentModel);
        return this.contentModelToContentResponseDtoConverter.convert(contentModel);
    }

    async update(ucDto: UpdateContentRequestDto) {
        const contentModel = await this.contentRepository.findOneByIdWithOptions(ucDto.id);
        if (contentModel) {
            if (ucDto.name || ucDto.displayName || ucDto.published) {
                contentModel.name = ucDto.name || contentModel.name;
                contentModel.displayName = ucDto.displayName || contentModel.displayName;
                contentModel.published = ucDto.published || contentModel.published;
            }
            if (ucDto.content || ucDto.summary) {
                const contentRevisionModel = new ContentRevisionModel();
                contentRevisionModel.content = ucDto.content || '';
                contentRevisionModel.summary = ucDto.summary || '';
                contentRevisionModel.parent = contentModel;
                contentModel.contentRevisions.push(contentRevisionModel);
                await this.contentRevisionRepository.save(contentRevisionModel);
            }
            await this.contentRepository.save(contentModel);
            return this.contentModelToContentResponseDtoConverter.convert(contentModel);
        } else {
            return null;
        }
    }

    async delete(idDto: IDDto) {
        const contentModel = await this.contentRepository.findOneByIdWithOptions(idDto.id);
        if (contentModel) {
            await this.contentRepository.delete({id: contentModel.id});
            return true;
        } else {
            return false;
        }
    }
}
